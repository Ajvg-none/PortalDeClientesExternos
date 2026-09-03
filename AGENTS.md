# AGENTS.md — Portal de Clientes Externos

Guía de trabajo para agentes de IA (o personas) que intervengan en este proyecto.

## 1. Fuente de verdad (leer SIEMPRE primero)

- El documento maestro del proyecto es **`INFORMACION DEL PROYECTO.txt`** (raíz del proyecto).
  Contiene: stack tecnológico, requisitos funcionales **RF-01 … RF-56**, análisis de pantallas/frontend,
  esquema SQL de PostgreSQL y los **anexos autoritativos**: puntos críticos (v1), decisiones de negocio y
  seguridad (v1.1) y pilares técnicos de arquitectura modular, Docker y despliegue/SSL (v1.2).
- Regla: **antes de tocar código, proponer cambios o responder preguntas técnicas, leer el TXT completo.**
- Los **anexos del TXT son autoritativos**: aclaran y deciden puntos críticos, decisiones de negocio y
  pilares técnicos, y prevalecen ante ambigüedades del cuerpo del documento. Si detectas una contradicción,
  mandan los anexos.
- **No duplicar** la información del TXT en otros archivos: referencia el TXT. Este AGENTS.md solo resume
  contexto y reglas operativas para el agente.
- Estado actual del proyecto: **planificación/desarrollo incipiente** (solo existe documentación, aún no hay
  código). No inventes estructura de carpetas, endpoints ni contratos que contradigan el documento.
- El **`PLAN_DE_DESARROLLO.md`** (raíz) contiene el plan de implementación por fases en formato checklist,
  con Gates por fase y criterios de prueba por ítem. Ejecutarlo en **orden estricto**: cada ítem requiere su
  prueba unitaria en verde y cada fase exige el Gate de la fase anterior antes de comenzar.

## 2. Resumen del proyecto

Cadena óptica nacional con laboratorio propio de producción. El laboratorio fabrica lentes para las tiendas
de la cadena (vía un SaaS + middleware existente) y también terceriza producción para **ópticas externas
(clientes)**. Este proyecto es un **portal web** donde esas ópticas externas crean y gestionan sus órdenes de
trabajo óptico de forma digital, ordenada y trazable.

- Roles: **CLIENTE_EXTERNO**, **LABORATORIO**, **ADMINISTRADOR** (sin registro público). Las cuentas las
  crea el administrador asignando un **`username` único** y obligatorio; el login es por `username` +
  contraseña (DEC-2).
- El portal se integra con el middleware existente en **modelo PULL** (ver R1).
- Reglas de negocio duras: una orden **no se edita ni se cancela** después de enviada (RF-17/RF-22/RF-32);
  Laboratorio y Administrador **solo visualizan** órdenes (nunca crean/editan/aprueban/rechazan); no se
  permiten adjuntos (RF-11); el N° de Orden del cliente es único en el sistema (RF-10).

## 3. Stack objetivo (definido en el documento)

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite (SPA) |
| Backend | Node.js 20 LTS + Express |
| ORM | Prisma |
| BD | PostgreSQL 16 |
| Autenticación | JWT + bcryptjs |
| Integración externa | API Key en header `X-API-Key` |
| Despliegue | Docker (multi-stage) + Docker Compose (dev y prod, anexo v1.2) |
| Arquitectura | Modular por características: backend `modules/` · frontend `features/` (ARQ-1) |
| Proxy / TLS (prod) | Nginx reverse proxy + Let's Encrypt (Certbot), dominio oficial (ARQ-3) |
| Testing/Dev | Jest, Supertest, Nodemon, morgan, express-validator |
| Docs API | OpenAPI/Swagger (documentar los endpoints de integración) |
| VCS | Git |
| Lenguaje | TypeScript en backend y frontend (decisión v1.3 del anexo TXT) |

## 4. Reglas obligatorias para el agente

Estas reglas resumen las decisiones **v1** del anexo del TXT. Ante cualquier duda, lee el anexo completo.

### R1 — Plataforma primero; no asumir nada del middleware

- Construir la **plataforma (portal)** primero. **No asumir** comportamiento interno del middleware:
  reintentos, tiempos de polling, deduplicación ni el resultado de su procesamiento.
- Única interacción definida (y la única que se implementa):
  - Middleware consulta con **`GET /api/external-orders/pending`** (RF-35…38), protegido con API Key
    (`X-API-Key`), con paginación `limit`/`offset`.
  - Middleware confirma con **`PUT /api/external-orders/:externalId/sync`** (RF-49…52).
- El **portal nunca inicia comunicación** (RF-42). No diseñar push, webhooks ni reintentos desde el portal.

### R2 — Estados de sincronización (solo 2 en v1)

- Estados: `PENDIENTE` (creada, aún no confirmada) y `SINCRONIZADA` (confirmada por middleware). **No existe
  "En proceso"** (la Opción B de RF-45 quedó descartada).
- El `GET /pending` **NO cambia el estado** de las órdenes al entregarlas: entregar ≠ sincronizar.
- Una orden deja de entregarse **solo** cuando el middleware la confirma con `PUT /sync`.
- Consecuencia aceptada (entrega *al menos una vez*): una orden no confirmada se sigue entregando en polls
  posteriores. El portal no distingue "no procesada" de "procesada sin confirmar" (RF-44).
- Medidas del portal: `PUT /sync` **idempotente** (confirmar algo ya sincronizado → HTTP 200, sin error);
  registrar `created_at` y `synced_at`; el listado del administrador muestra antigüedad **"pendiente desde"**
  para detectar órdenes estancadas (escalar es procedimiento operativo, no función de v1).
- Fuera de v1: entrega única (exactly-once) — requeriría estado intermedio tipo `EN_PROCESO` + paginación por
  cursor y un nuevo contrato acordado con el middleware. **No diseñarlo ahora.**

### R3 — Paginación del endpoint de pendientes (sin saltos)

- Ordenar **siempre** por `created_at ASC, id ASC` (FIFO, más antiguas primero).
- `GET /pending` es de **solo lectura** (ver R2): el conjunto de pendientes solo cambia cuando el middleware
  confirma syncs.
- Patrón de consumo soportado por el contrato (regla del endpoint, no suposición del middleware):
  1. un ciclo de sincronización = **una sola petición** (`offset=0`, `limit` = tamaño del lote); o
  2. varias peticiones secuenciales (0, limit, 2·limit…) hasta cubrir `total`, y **recién después** confirmar
     los syncs del ciclo. **No intercalar GET y PUT /sync** en el mismo ciclo.
- Índice recomendado para el endpoint: compuesto `(sync_status, created_at, id)`.

### R4 — Contrato JSON: solo lo que el portal puede poblar

- El JSON de respuesta se construye **únicamente** con datos ciertos del portal: `number` (N° de Orden del
  cliente), `date` (ISO 8601 con offset; almacenar UTC), `customer`, `opticalDataOD/OI`, `treatment`, `mount`,
  `coloration`, `observations`; y las constantes `orderFromSupplier: true`, `status: "CONFIRMED"`.
- Campos que **NO se entregan en v1** (su valor solo puede originarse en el middleware): `warehouse`
  (el portal no administra bodegas), `issuedOrderId`/`issuedInvoiceId` (los genera el pipeline del middleware;
  requerirían write-back en el PUT /sync) e `items[]` enriquecido con descripciones de catálogo.
- Si un agente toca el contrato, debe respetar esta regla o dejar el cambio explícitamente anotado como
  "pendiente de acordar con el middleware".

### R5 — Identidad de la orden (no confundir)

- `order_number` ("Número de Orden" del formulario, RF-08): identificador **de negocio** que asigna el
  cliente; único en el sistema (`UNIQUE`); es el que se muestra en pantallas.
- `external_id`: **UUID generado por el portal** (`DEFAULT gen_random_uuid()`); identificador **técnico/canónico**
  de integración. Se entrega como `externalId` en el JSON y es **el único valor que el middleware usa** en el
  path de `PUT /sync`. (El ejemplo del RF-48 con `"98765"` es engañoso; siempre es UUID.)

### R6 — Consistencia del documento (correcciones menores ya acordadas)

- RF-45 Opción B: sin efecto. "En proceso" no es un estado.
- La acción "editar" en tablas es solo de **gestión de usuarios** (administrador); las órdenes jamás se editan.
- Valores de montura/tratamiento: usar **strings idénticas** entre formulario, CHECK de la BD y JSON.
- `api_keys`: en v1 una sola fila activa (la tabla admite varias solo para rotación futura, no implementada).

### R7 — Arquitectura modular por características (ARQ-1, anexo v1.2)

- Backend: el código se organiza en **módulos por dominio** bajo `backend/src/modules/<módulo>/`, cada uno
  con sus rutas, controladores, servicios, DTOs/esquemas y tests. Módulos v1: `auth`, `users`, `orders`,
  `external-orders`, `reports`; capa transversal en `backend/src/core`.
- Frontend: **features** bajo `frontend/src/features/<feature>/` (pages/components/hooks/api/types) + capas
  `app` (rutas/guards por rol), `shared` (UI reutilizable) y `core` (cliente HTTP/sesión).
- Bajo acoplamiento: los módulos de negocio **no importan implementaciones internas de otros módulos**; se
  consumen por sus servicios públicos. Un cambio dentro de una feature no debe forzar cambios en otras.

### R8 — Contenedores y paridad local/producción (ARQ-2, anexo v1.2)

- Todo el desarrollo local corre **dentro de contenedores** (Node 20 LTS, PostgreSQL 16; sin dependencias en
  el host); paridad estricta dev = CI = prod.
- Dockerfiles multi-stage (dev y prod) para backend y frontend; `docker-compose.yml` (desarrollo) y
  `docker-compose.prod.yml` (producción, Fase 8 del plan).
- Comandos de prueba/build dentro del contenedor (p. ej. `docker compose exec api npm test`).

## 5. Decisiones de negocio y seguridad RESUELTAS (v1.1)

Cerradas y registradas en el anexo del TXT (bloque "DECISIONES DE NEGOCIO Y SEGURIDAD - RESUELTAS v1.1").
Son reglas de negocio vigentes: no reinterpretarlas ni reabrirlas sin consultar al dueño del proyecto.

1. **DEC-1 — Unicidad del N° de Orden:** **global** (`order_number` UNIQUE, RF-10) para v1; re-evaluar solo
   si se reportan colisiones reales entre clientes.
2. **DEC-2 — Alta de usuarios:** el administrador asigna un `username` único y obligatorio al dar de alta;
   login por `username` + contraseña; email y teléfono son solo contacto interno (no autentican ni notifican).
3. **DEC-3 — "Empresa" en la orden:** autopoblada desde `users.company_name` del usuario autenticado en modo
   solo lectura; la orden conserva snapshot → filtros y estadísticas consistentes.
4. **DEC-4 — Baja de usuarios:** **sin borrado físico** (no existe DELETE); baja = `is_active = false`
   (integridad con `orders.created_by`); en la UI la acción es "dar de baja / reactivar".
5. **DEC-5 — Códigos de producto:** `od_product_code`/`oi_product_code` texto libre, sin catálogo en v1.
6. **DEC-6 — Primer acceso:** cambio de contraseña **obligatorio** tras clave temporal o reset del admin
   (flag `users.must_change_password`, DEFAULT TRUE; solo el cambio de contraseña es accesible hasta
   completarlo).

## 6. Modelo de datos (resumen)

Tablas definidas en el TXT: `users` (rol, `is_active`, credenciales), `api_keys` (una activa en v1), `orders`
(datos generales + fórmula OD/OI + tratamiento + montura + coloración + observaciones + estado de sync +
auditoría `created_by/created_at/updated_at`). Índices recomendados en el TXT + `(sync_status, created_at, id)`.

- Convenciones: snake_case en BD; `TIMESTAMPTZ` (UTC); enums `user_role` y `sync_status`.
- Delta del anexo v1.1 (DEC-6): columna `users.must_change_password BOOLEAN NOT NULL DEFAULT TRUE` — debe
  incluirse en la migración inicial (ítem B1.3 del plan).
- Cuando exista `schema.prisma`, debe reflejar el SQL del documento **más los deltas del anexo (v1.1)**;
  **no cambiar el modelo silenciosamente**: anota cualquier divergencia o proponla como decisión explícita.

## 7. Frontend (resumen de lo planificado)

- Pantallas por rol según el TXT (login → dashboard según rol; listados/detalles; formulario de orden con
  resumen-modal previo al envío; gestión de usuarios + dashboard de estadísticas para admin; 404).
- Decisiones UI/UX ya tomadas (página vs. modal) están documentadas en el TXT — respetarlas.
- Formularios: React Hook Form + Yup/Zod; validación asíncrona de unicidad del N° de Orden; obligatorios:
  N° de Orden y Paciente (RF-09), con el campo **"Empresa" autopoblado** desde la cuenta del usuario en
  modo solo lectura (DEC-3).
- Primer acceso (DEC-6): si el login devuelve `mustChangePassword`, el usuario debe completar una pantalla
  de cambio de contraseña obligatorio antes de navegar (backend: ítem U2.8 del plan).

## 8. Flujo de trabajo recomendado para el agente

1. **Leer** `INFORMACION DEL PROYECTO.txt` completo (y este AGENTS.md) antes de actuar; si la tarea es de
   implementación, seguir el orden e ítems de `PLAN_DE_DESARROLLO.md`.
2. Citar el **RF** correspondiente al proponer o implementar cambios (ej. "RF-35…38").
3. Idioma: documentación y UI en **español**. Mantener numeración RF; no renumerar.
4. Si un requisito cambia: actualizar el **ANEXO** del TXT (o agregar una entrada fechada de decisión) en vez
   de editar silenciosamente el cuerpo de los RF.
5. Backend: validación con express-validator; tests Jest + Supertest para endpoints (incluidos los de
   integración: auth por API Key, paginación, idempotencia del sync); documentar contrato con OpenAPI.
6. No afirmar que algo está terminado/funciona sin ejecutarlo y verificar (tests/build reales).
7. No crear archivos duplicados de documentación del proyecto fuera del TXT/AGENTS.md.

## 9. Arquitectura e infraestructura (pilares técnicos v1.2)

Resumen operativo de los pilares del anexo v1.2 del TXT (detalle completo allá; no duplicar):

- **ARQ-1 — Modular:** backend por módulos (`auth`, `users`, `orders`, `external-orders`, `reports`) con
  rutas/controladores/servicios/DTOs/tests propios; frontend por features; capas comunes `core`/`shared`/
  `app`; sin dependencias cruzadas entre módulos de negocio (regla R7). Implementación: ítems B1.1/B1.4 del
  plan.
- **ARQ-2 — Docker:** Dockerfiles multi-stage (dev/prod); desarrollo 100% dentro de contenedores con Node
  20 LTS y PostgreSQL 16 fijos (dev = CI = prod); compose de desarrollo y de producción (regla R8).
  Implementación: B1.2 y Fase 8 (I8.3).
- **ARQ-3 — Producción/SSL:** VPS con Docker; proxy inverso Nginx como único punto de entrada (terminación
  SSL/TLS, redirección HTTP→HTTPS, enrutado `<dominio>/` → frontend y `<dominio>/api/` → backend);
  certificados Let's Encrypt vía Certbot con renovación automática; sin certificados autofirmados en
  producción. Implementación: Fase 8 (I8.1–I8.7).
- `<dominio>` = dominio oficial del proyecto; se define en I8.2 antes de emitir certificados.
