# Plan de Desarrollo por Fases — Portal de Clientes Externos

> Checklist de implementación para agentes y desarrolladores. Fuente de verdad: `INFORMACION DEL PROYECTO.txt`
> (RF-01…RF-56 + anexos autoritativos v1/v1.1/v1.2). Guía operativa: `AGENTS.md`. Reglas R1–R8 del AGENTS.md
> son de cumplimiento obligatorio en todos los ítems.
>
> **Orden estricto:** las fases se ejecutan en secuencia; cada fase exige el "Gate" (criterios de fase) de la
> fase anterior en verde antes de comenzar. Cada ítem es una unidad desacoplada con su propia prueba;
> ningún ítem se da por terminado sin su prueba unitaria pasando.

**Objetivo:** portal web (SPA) para que ópticas clientes creen órdenes ópticas, el laboratorio las visualice
(read-only) y el middleware existente las consuma por PULL (`GET /pending` + `PUT /sync`), sin asumir nada del
middleware y con el portal como única pieza a construir en v1.

**Stack (definido):** React 18 + Vite · Node 20 LTS + Express · Prisma · PostgreSQL 16 · JWT + bcryptjs ·
API Key `X-API-Key` · Docker Compose · Jest + Supertest (backend) · morgan · express-validator ·
OpenAPI/Swagger.

**Restricciones globales (heredadas de AGENTS.md / Anexo):**
- Plataforma primero; no asumir comportamiento interno del middleware (R1).
- Única integración: `GET /api/external-orders/pending` y `PUT /api/external-orders/:externalId/sync` (R1).
- Solo 2 estados de sync: `PENDIENTE` → `SINCRONIZADA`; el GET no cambia estados; el PUT es idempotente (R2).
- Paginación FIFO `created_at ASC, id ASC`; contrato de consumo sin intercalar GET/PUT (R3).
- JSON de respuesta solo con datos poblabes por el portal + constantes `orderFromSupplier:true`/`status:"CONFIRMED"`;
  sin `warehouse`, `issuedOrderId/issuedInvoiceId`, `items[]` en v1 (R4).
- Identidad: `order_number` (negocio, único) vs `external_id` (UUID canónico, único para integración) (R5).
- Órdenes inmutables tras envío; Laboratorio y Administrador solo lectura de órdenes (R6).
- Decisiones v1.1 del anexo (DEC-1…DEC-6): unicidad global del N° de Orden; alta con `username` único
  asignado por el admin (login por username); "Empresa" autopoblada en solo lectura; baja lógica sin
  DELETE; códigos de producto texto libre; cambio de contraseña obligatorio en primer acceso.
- Idioma español (código, UI, docs). BD: snake_case, `TIMESTAMPTZ` UTC, enums `user_role`, `sync_status`.
- Backend probado con Jest + Supertest; validaciones con express-validator; contrato documentado en OpenAPI.
- Arquitectura modular por características (ARQ-1, anexo v1.2): backend `/backend/src/modules/<módulo>/`
  con routes/controllers/services/dto + tests; frontend `/frontend/src/features/<feature>/` con pages/
  components/hooks/api/types + capas comunes `/app`, `/shared`, `/core`; `/infra` (Docker/compose/nginx/
  deploy). Sin dependencias cruzadas entre módulos de negocio.
- Containerización (ARQ-2): todo el desarrollo local corre dentro de contenedores; Node 20 LTS y PostgreSQL
  16 fijos (dev = CI = prod); Dockerfiles multi-stage; compose de desarrollo y de producción.
- Producción (ARQ-3, Fase 8): proxy inverso Nginx con SSL/TLS Let's Encrypt sobre el dominio oficial; solo
  puertos 80/443 públicos. Git desde el inicio, commits frecuentes por ítem.
- Lenguaje: TypeScript en backend y frontend (decisión v1.3 del anexo del TXT); Prisma genera los tipos
  desde el schema.

---

## Requisito previo — Decisiones aplicadas (v1.1, cerradas)

Las decisiones D1–D6 están **resueltas y registradas** en el anexo del TXT (bloque v1.1, DEC-1…DEC-6).
Impacto en las tareas de este plan:

- **DEC-1** (unicidad N° de Orden): se mantiene **global** (`order_number` UNIQUE) en v1 → O3.2 sin cambios;
  registrar colisiones reales si ocurren (evaluación operativa futura).
- **DEC-2** (alta con `username` asignado por el admin; login por username) → U2.5–U2.7 y F6.2.
- **DEC-3** ("Empresa" autopoblada desde `company_name`, solo lectura; la orden guarda snapshot) → O3.1/O3.3,
  E5.1 y F6.4.
- **DEC-4** (baja = desactivación lógica; sin DELETE físico) → U2.7 y F6.7.
- **DEC-5** (códigos de producto texto libre) → sin impacto en el contrato (Fase 4).
- **DEC-6** (cambio de contraseña obligatorio en primer acceso) → B1.3 (delta de esquema), U2.8, F6.2/F6.10
  y X7.2 (queda cubierto en Fase 2).

**Gate de prerrequisitos:** cumplido — decisiones cerradas (v1.1). No se consulta al dueño salvo que se
quiera reabrir alguna (se registra como nueva entrada fechada en el anexo).

---

## Fase 1 — Configuración base y entidades de datos

Cubre: estructura modular del código (ARQ-1), containerización de desarrollo (ARQ-2), BD y API mínima. Nada
de lógica de negocio aún.

- [x] **B1.1 Estructura modular del código base (ARQ-1).** Esqueleto `/backend/src/modules/<módulo>/`
      (routes, controllers, services, dto, tests) para `auth`, `users`, `orders`, `external-orders` y
      `reports` + capa transversal `/backend/src/core` (config, prisma, errores, logger, middlewares) y
      esqueleto `/frontend/src/features/<feature>/` + capas `/app`, `/shared`, `/core` + `/infra` +
      `.env.example` y `.gitignore`. Sin lógica de negocio aún. Criterio: script/check de estructura
      verifica que cada módulo previsto existe con sus subcarpetas y convenciones de nombres, y que
      `.env.example` documenta las variables usadas (sin secretos reales).
- [x] **B1.2 Dockerfiles multi-stage y docker-compose de desarrollo (ARQ-2).** Dockerfiles multi-stage de
      backend (stage dev con hot-reload y stage prod con runtime mínimo) y de frontend (build estático de
      Vite); `docker-compose.yml` de desarrollo orquesta `db` (postgres:16 con volumen), `api` (Node 20 con
      bind-mount) y `frontend` (dev server de Vite con proxy `/api` al backend), todos con healthcheck.
      Todo el desarrollo local corre dentro de los contenedores (paridad Node/PostgreSQL con producción,
      versiones fijadas). Criterio: `docker compose up` deja los 3 servicios en verde (healthchecks) y un
      test de ejemplo pasa con `docker compose exec api npm test`.
- [x] **B1.3 Migración inicial Prisma.** Enums `user_role` y `sync_status`; tablas `users`, `api_keys`,
      `orders` (columnas e índices idénticos al esquema SQL del TXT **+ delta del anexo v1.1: columna
      `users.must_change_password BOOLEAN NOT NULL DEFAULT TRUE`**, DEC-6) + índice compuesto
      `(sync_status, created_at, id)`. Criterio: prueba de integración que aplica migraciones sobre una BD
      limpia y verifica que el snapshot coincide 1:1 con el SQL de referencia del TXT y el delta v1.1 del
      anexo.
- [x] **B1.4 API Express base con montaje modular (ARQ-1).** App que registra middlewares globales
      (errores/JSON, morgan) y monta el router de cada módulo en `/api/<módulo>` (`auth`, `users`, `orders`,
      `external-orders`, `reports` — aún sin endpoints de negocio) + `GET /api/health`. Criterio: test
      Supertest verifica 200 de health, que los routers modulares quedan registrados (404 JSON controlado
      en ruta desconocida) y que un error lanzado responde el formato estándar (JSON `message`/`code`).
- [x] **B1.5 Banco de pruebas backend en contenedor.** Jest + Supertest configurados; cada test corre contra
      BD de prueba aislada y limpia; la suite se ejecuta dentro del contenedor de la API (misma imagen base
      que dev y CI). Criterio: `docker compose exec api npm test` termina en verde sin depender del orden de
      ejecución, tanto en local como en CI.

**Gate F1:** compose dev levanta limpio (db + api + frontend), estructura modular verificada (B1.1),
migración idéntica al TXT + deltas v1.1, health 200 y suite de ejemplo en verde dentro del contenedor.

---

## Fase 2 — Autenticación, control de acceso y gestión de usuarios

Cubre RF-01…RF-04 y RF-23…RF-27. Depende de Fase 1 (gate en verde). El frontend se integra en Fase 6.

- [x] **U2.1 Utilidades de contraseña (bcryptjs).** Cifrado y verificación. Criterio: prueba unitaria verifica
      que el hash nunca guarda el texto plano, que una contraseña correcta verifica y una incorrecta no.
- [x] **U2.2 Emisión y validación de JWT.** Generación con `sub`, `role`, `exp`; validación de token firmado,
      vencido y alterado. Criterio: prueba unitaria verifica payload correcto, rechazo de token expirado y de
      firma inválida.
- [x] **U2.3 Middleware de autenticación.** Exige token válido en cada request protegido y **revalida
      `is_active` del usuario en cada petición** (un usuario deshabilitado pierde acceso de inmediato).
      Criterio: prueba unitaria con usuario inactivo responde 401 aunque el token sea válido.
- [x] **U2.4 Middleware de autorización por rol.** Roles `CLIENTE_EXTERNO`, `LABORATORIO`, `ADMINISTRADOR`.
      Criterio: matriz de pruebas unitarias verifica allow/deny (403) para cada rol en rutas de ejemplo
      protegidas con cada permiso.
- [x] **U2.5 Login (`POST /auth/login`).** `username` + contraseña (RF-01/02, DEC-2); respuesta con token,
      rol e indicador `mustChangePassword` (DEC-6). Criterio: prueba unitaria/integración verifica 200 con
      credenciales válidas, 401 con contraseña incorrecta, 401 con usuario inexistente, 403/401 con usuario
      inactivo y el valor correcto de `mustChangePassword` según el estado de la cuenta.
- [x] **U2.6 Servicio de administración de usuarios.** Alta/edición con datos de RF-24 (**username único
      asignado por el admin, obligatorio** + empresa, email, teléfono, dirección, contraseña temporal),
      alta de usuarios de laboratorio, habilitar/deshabilitar y reset de contraseña (RF-23/25/26); email y
      teléfono solo como contacto interno (DEC-2); al crear o resetear la contraseña queda
      `must_change_password = TRUE` (DEC-6). Criterio: prueba unitaria del servicio verifica que la
      contraseña temporal queda hasheada, que `username` es único y obligatorio, que email/username se
      validan, que alta y reset dejan el flag en TRUE, y que deshabilitar revierte el acceso (ver U2.3).
- [x] **U2.7 Endpoints de gestión de usuarios (solo admin) + listado filtrable.** Crear (pide `username`
      obligatorio, DEC-2), editar, habilitar/**dar de baja** y reset de contraseña, y listado con filtros por
      nombre/rol/estado (RF-23…RF-27). **Sin ruta DELETE de usuarios**: la baja es exclusivamente lógica
      (`is_active=false`, DEC-4). Criterio: pruebas de endpoints verifican 403 para rol no admin, validación
      de entrada (express-validator), que el listado filtra por nombre, rol y estado activo/inactivo, y que
      no existe endpoint de borrado físico (la baja desactiva sin eliminar filas ni órdenes asociadas).
- [x] **U2.8 Cambio de contraseña obligatorio en primer acceso (DEC-6/X7.2).** Endpoint
      `POST /auth/change-password` (contraseña actual + nueva). Mientras `users.must_change_password` sea
      TRUE, el usuario autenticado solo puede ejecutar este endpoint; el resto responde 403 (extensión del
      middleware U2.3). Al completar el cambio: flag → FALSE y acceso normal con la nueva contraseña. Aplica
      también tras un reset del admin (RF-26, U2.6). Criterio: pruebas verifican que con flag activo los
      endpoints protegidos (excepto change-password) responden 403, que el cambio valida la contraseña
      actual y limpia el flag, y que la contraseña anterior deja de autenticar.

**Gate F2:** matriz de roles en verde, login por username probado (con `mustChangePassword`), CRUD de
usuarios admin cubierto (sin DELETE), un usuario deshabilitado no puede autenticarse ni mantener acceso, y
el flujo de primer acceso (U2.8) probado.

---

## Fase 3 — Dominio de órdenes (cliente)

Cubre RF-05…RF-17. Depende de Fase 2 (se usa el usuario autenticado como `created_by`).

- [ ] **O3.1 Normalización del payload de orden.** Transformar entrada del formulario a estructura canónica
      (trim, números con decimales y signo, listas cerradas de tratamiento/montura con las strings exactas
      del anexo R6, coloración opcional, observaciones). La entrada **no incluye "Empresa"**: se ignora o
      rechaza cualquier `company` enviado por el cliente (DEC-3). Criterio: prueba unitaria con casos límite
      (OD vacío y OI lleno, esferas negativas, degradado sin unicolor) produce la estructura canónica
      esperada sin errores (RF-09: sin validación estricta numérica) y verifica que un payload con `company`
      ajeno no altera el valor resultante.
- [ ] **O3.2 Validación de unicidad del N° de Orden (RF-10).** Rechazo si `order_number` ya existe (global;
      DEC-1). Criterio: prueba unitaria verifica error de duplicado ante un segundo envío con el mismo
      número y que la carrera concurrente queda cubierta por el constraint de BD (error 409 mapeado).
- [ ] **O3.3 Creación de orden.** Guardar con `external_id` UUID generado, `sync_status=PENDIENTE` (RF-13),
      fecha/hora de creación automática (RF-07.1), `created_by` del token; obligatorios: N° de Orden y
      Paciente (RF-09); **`company` se autopobla desde `users.company_name` del usuario autenticado
      (snapshot, DEC-3)** y **sin soporte de adjuntos** (RF-11: la API no acepta multipart ni archivos).
      Criterio: prueba unitaria del servicio verifica que `company` es igual al `company_name` de la cuenta
      autenticada (snapshot), los campos resultantes y el estado inicial.
- [ ] **O3.4 Proyección de resumen y detalle.** Resumen "OD -2.50 / OI -2.25" con manejo de vacíos (RF-05) y
      detalle completo de todos los datos (RF-16). Criterio: prueba unitaria de formateo verifica el texto del
      resumen con valores nulos en un ojo y que el detalle expone cada campo ingresado.
- [ ] **O3.5 Listado e historial del cliente.** Paginado desde backend, ordenado por fecha de creación
      descendente, filtro por rango de fechas (RF-05/15) e indicador "total de órdenes creadas" (RF-06).
      Criterio: prueba unitaria del servicio verifica orden, filtro, paginación y el conteo total del cliente.
- [ ] **O3.6 Invariantes de inmutabilidad.** Ninguna ruta permite editar, cancelar ni eliminar órdenes para
      ningún rol (RF-17/22/32). Criterio: pruebas de endpoints verificar 404/405 ante PUT/DELETE sobre una
      orden y 403 al intentar crear órdenes con rol LABORATORIO/ADMINISTRADOR (RF-22/32).

**Gate F3:** crear orden (feliz y duplicado) probado, listado/historial probado, inmutabilidad verificada por
tests, suite F3 en verde.

---

## Fase 4 — Integración con el middleware (contrato PULL)

Cubre RF-35…RF-56 y las reglas R1–R5 del anexo. Depende de Fase 3 (usa órdenes existentes). Es la fase de
contrato: no se asume nada del middleware (R1).

- [ ] **M4.1 Credencial de integración.** Semilla/gestión de la API Key única y estática (RF-40) y middleware
      que exige header `X-API-Key` (RF-39/41). Criterio: prueba unitaria del middleware verifica 401 sin
      header, 401 con clave inválida/inactiva y 200 con la clave activa.
- [ ] **M4.2 `GET /api/external-orders/pending` — selección y orden.** Devuelve **solo** órdenes
      `PENDIENTE`, ordenadas `created_at ASC, id ASC` (FIFO, R3). Criterio: prueba de integración con
      dataset mixto (pendientes y sincronizadas, fechas desordenadas) verifica contenido y orden exactos.
- [ ] **M4.3 `GET /api/external-orders/pending` — paginación `limit`/`offset` + `total` (RF-37).**
      Criterio: prueba unitaria del servicio verifica páginas estables cuando **no** se intercalan
      confirmaciones (patrón de contrato R3) y que el endpoint **no modifica** ningún estado al entregar (R2).
- [ ] **M4.4 Serialización canónica (RF-38, R4, R5).** Mapeo orden→JSON: `number=order_number`,
      `externalId=external_id (UUID)`, `date` ISO 8601 con offset, datos ópticos, tratamiento/montura/
      coloración/observaciones + constantes `orderFromSupplier:true`, `status:"CONFIRMED"`. **Sin**
      `warehouse`, `issuedOrderId/issuedInvoiceId` ni `items[]`. Criterio: prueba unitaria del mapeador
      verifica un JSON idéntico al esperado (snapshot) para una orden con todos los campos y otra con
      campos opcionales vacíos.
- [ ] **M4.5 `PUT /api/external-orders/:externalId/sync` (RF-49/50).** Marca `SINCRONIZADA` y registra
      `synced_at`; busca por UUID (R5); 404 si no existe (RF-51); protegido con API Key (RF-52); **idempotente**
      (segunda confirmación → 200 sin error, R2/PC-1). Criterio: pruebas de endpoint verifican 200+estado
      cambiado, 404 con UUID inexistente, 401 sin clave, e idempotencia ante confirmación repetida.
- [ ] **M4.6 Visibilidad de estados por rol (RF-53…56, PC-1c).** Cliente y Laboratorio nunca reciben el estado
      de sincronización en sus listados/detalles; Administrador sí, con antigüedad **"pendiente desde"**.
      Criterio: pruebas de serialización por rol verifican ausencia/presencia del campo y el cálculo de la
      antigüedad.
- [ ] **M4.7 Listados globales para Laboratorio y Administrador (RF-18…21 y RF-28…31).** Endpoints paginados de
      TODAS las órdenes (cualquier cliente) con filtros por rango de fechas y por cliente (empresa); el de
      Administrador agrega filtro por estado de sincronización y la columna de estado + "pendiente desde"
      (M4.6). Ambos de solo lectura (RF-22/32). Criterio: pruebas de endpoint verifican paginación, cada
      combinación de filtros, la exclusión del campo de estado para Laboratorio y la inclusión para
      Administrador, y 403/405 ante intentos de modificar o crear órdenes con estos roles.

**Gate F4:** pruebas de contrato (M4.4 snapshot) en verde; consumo simulado "GET→procesar→PUT" pasa sin
cambiar estados antes del PUT; idempotencia y 404 verificados; listados globales por rol (M4.7) cubiertos por
tests.

---

## Fase 5 — Estadísticas y reportes (administrador)

Cubre RF-33…RF-34. Depende de Fases 3 y 4 (datos multi-cliente con estados).

- [ ] **E5.1 Consultas agregadas del dashboard.** Total de órdenes por mes (agrupado en zona horaria
      configurada), top 5 clientes por cantidad de órdenes, y pendientes vs sincronizadas (RF-33). Criterio:
      pruebas unitarias con dataset fijo verificar cada agregado (meses, top 5 ordenado, conteos por estado)
      y que la agrupación por cliente usa la `company` autopoblada y consistente de la orden (DEC-3).
- [ ] **E5.2 Exportación CSV/Excel con filtros aplicados (RF-34).** Generador de reporte (encabezados,
      escapado de comas/saltos de línea, codificación compatible con Excel — BOM UTF-8) y endpoint que
      respeta los mismos filtros de fechas/cliente/estado. Criterio: prueba unitaria del generador verifica
      el contenido del archivo (filas/columnas/escapado) y prueba de endpoint verifica que el archivo
      descargado contiene exactamente las órdenes del filtro aplicado.

**Gate F5:** agregados y exportación probados con dataset controlado; sin datos de producción.

---

## Fase 6 — Frontend por rol (SPA)

Cubre las pantallas definidas en el TXT (login, dashboard cliente, formulario de orden, detalle, paneles de
laboratorio y administración). Depende de Fases 2, 3 y 5 (endpoints reales). Decisiones página-vs-modal del
TXT son obligatorias. Pruebas de componente con la librería de testing elegida al iniciar el frontend
(recomendada: Vitest + React Testing Library).

- [ ] **F6.1 Aplicación base.** Vite + React + Router; layout con sidebar/header según rol y botón de cerrar
      sesión que redirige al login (RF-03); ruta 404 y manejo de sesión expirada (redirigir a login ante 401).
      Criterio: pruebas de componente verifican navegación por rol, logout y redirección 404/401.
- [ ] **F6.2 Pantalla de login (RF-01).** Formulario `username`/contraseña (DEC-2), error de credenciales y
      redirección según rol; si la respuesta trae `mustChangePassword: true`, redirige a la pantalla de
      cambio obligatorio (DEC-6, F6.10). Criterio: prueba de componente con API simulada verifica mensaje de
      error, éxito con ruta de destino por rol y redirección condicional por el flag.
- [ ] **F6.3 Dashboard del cliente (RF-05/06).** Tabla histórica (N° de orden, fecha, resumen óptico) con
      paginación y total de órdenes creadas. Criterio: prueba de componente verifica render de filas desde
      respuesta simulada y del indicador de total.
- [ ] **F6.4 Formulario de nueva orden (RF-07…13, RF-11).** Página con secciones (generales [N° de Orden,
      Paciente y **Empresa autopoblada en solo lectura**, DEC-3], fórmula OD/OI, tratamiento, montura,
      coloración, observaciones); solo N° de Orden y Paciente obligatorios; **validación asíncrona de
      unicidad** del N° de Orden (RF-10); modal de "Resumen de la orden" previo al envío (RF-12) y
      confirmación que redirige al listado con mensaje de éxito (RF-13); sin adjuntos (RF-11). Criterio:
      pruebas de componente verifican envío bloqueado con número duplicado (error mostrado), envío permitido
      con opcionales vacíos, que "Empresa" muestra el `company_name` de la cuenta sin permitir edición, y
      que el modal muestra los datos antes de confirmar.
- [ ] **F6.5 Historial y detalle de orden del cliente (RF-14…17).** Filtro por rango de fechas, orden más
      reciente primero, detalle completo en página aparte (solo lectura, sin editar/cancelar). Criterio:
      pruebas de componente verifican filtros aplicados sobre datos simulados y ausencia de acciones de
      edición en el detalle.
- [ ] **F6.6 Panel del Laboratorio (RF-18…22).** Listado de todas las órdenes con filtros de fechas y cliente;
      detalle de solo lectura. Criterio: pruebas de componente verifican que el listado muestra órdenes de
      distintos clientes, que no existen acciones de crear/editar y que el estado de sincronización no se
      muestra (M4.6).
- [ ] **F6.7 Panel de administración — usuarios (RF-23…27).** Listado con filtros (nombre/rol/estado) y
      acciones crear (con `username`)/editar/habilitar/dar de baja (desactivación lógica, DEC-4)/reactivar/
      reset de contraseña; **sin borrado físico**; confirmación modal para acciones destructivas. Criterio:
      pruebas de componente verifican filtros, que cada acción llama al endpoint correcto con confirmación
      previa y que no existe acción de eliminar definitivamente.
- [ ] **F6.8 Panel de administración — listado maestro de órdenes (RF-28…32).** Todas las órdenes con estado de
      sincronización + "pendiente desde", filtros de fecha/cliente/estado y detalle con estado. Criterio:
      pruebas de componente verifican columna de estado, filtros y ausencia de acciones de edición.
- [ ] **F6.9 Dashboard de estadísticas y exportación (RF-33/34).** Gráficos (por mes, pendientes vs
      sincronizadas, top 5) y botón de exportación del listado filtrado. Criterio: pruebas de componente
      verifican que los gráficos reciben los datos simulados del endpoint y que exportar descarga el archivo
      generado por E5.2.
- [ ] **F6.10 Pantalla de cambio de contraseña obligatorio (DEC-6).** Primer acceso con clave temporal o tras
      reset del admin: pantalla que exige la nueva contraseña antes de navegar al resto de la app; al
      completarla, continúa al dashboard según rol. Criterio: prueba de componente verifica que la navegación
      queda bloqueada hasta completar el cambio y que la redirección posterior es correcta.

**Gate F6:** flujos felices por rol verificados con componentes + API simulada; flujo de primer acceso
(F6.10) cubierto; sin pantallas pendientes del listado del TXT.

---

## Fase 7 — Contrato, endurecimiento y despliegue (transversal)

Depende de todas las fases anteriores. Endurecimiento marcado como "(recomendado)" requiere visto bueno del
dueño del proyecto antes de implementarse (no está en RF, proviene de la revisión).

- [ ] **X7.1 Documentación OpenAPI del contrato.** Spec de endpoints internos y de integración (incluida la
      autenticación por API Key y los códigos de error 401/404/409) generada desde el código. Criterio:
      prueba de validación verifica que cada endpoint documentado responde conforme a su spec (contrato real
      vs spec).
- [ ] **X7.2 Endurecimiento de seguridad adicional (recomendado, requiere OK del dueño).** El cambio forzado
      en primer acceso ya está implementado en Fase 2 (U2.8/F6.10, DEC-6). Pendiente de aprobación del
      dueño: política mínima de contraseñas (longitud/complejidad) y límite de intentos de login. Criterio:
      pruebas unitarias verifican rechazo de contraseñas fuera de política y bloqueo tras N intentos
      fallidos.
- [ ] **X7.3 Pipeline de CI.** En cada commit/PR: lint + migración + suite completa de backend (y frontend si
      aplica) en un ambiente limpio. Criterio: el pipeline falla si alguna prueba falla y bloquea el merge.
- [ ] **X7.4 Imágenes multi-stage validadas en CI (ARQ-2).** Build de las imágenes dev/prod de backend y
      frontend en cada merge; migraciones controladas y configuración por variables de entorno (secretos
      fuera del repo). Criterio: el pipeline construye las imágenes (dev y prod) y el smoke test (health +
      login) pasa contra staging usando esas imágenes. El despliegue real al servidor se ejecuta en Fase 8.
- [ ] **X7.5 Prueba de recorrido integral (E2E mínimo).** Flujo: login cliente → crear orden → simular
      middleware consumiendo `GET /pending` (cliente HTTP de prueba, sin asumir implementación real) → `PUT
      /sync` → verificar estado "Sincronizada" en panel admin. Criterio: la prueba E2E/smoke pasa de punta a
      punta contra un ambiente de prueba y deja evidencia del contrato consumido.

**Gate F7 (proyecto v1 completo en staging):** suite completa en verde en CI, imágenes dev/prod construidas
y validadas, contrato OpenAPI validado, despliegue de staging operativo, recorrido integral pasando y
checklist sin ítems pendientes salvo los marcados como "requiere OK del dueño".

---

## Fase 8 — Infraestructura de producción: VPS, dominio, proxy inverso y SSL/HTTPS

Pone en producción el anexo v1.2 del TXT (ARQ-2/ARQ-3). Depende de Fase 7 (imágenes validadas en CI).
Requiere acceso de operador al servidor (VPS) y al DNS del **dominio oficial**; `<dominio>` se reemplaza por
ese dominio en toda configuración (runbook en `/infra`).

- [ ] **I8.1 Preparación del servidor VPS.** Docker Engine instalado; usuario de despliegue sin root; claves
      SSH; firewall con 22/80/443 únicamente. Criterio: script de verificación reporta OK (versión de
      Docker, puertos abiertos, acceso por SSH con clave) — chequeo de humo automatizable.
- [ ] **I8.2 Asociación del dominio oficial.** Registro DNS A/AAAA de `<dominio>` (o subdominio) apuntando a
      la IP pública del VPS; se fija el `<dominio>` definitivo del proyecto. Criterio: verificación de
      resolución (nslookup/curl) confirma que el dominio resuelve a la IP del servidor.
- [ ] **I8.3 Orquestación de producción con Docker (ARQ-2).** `docker-compose.prod.yml`: `api`, `frontend`
      (estático), `db` y proxy `nginx` en red interna; solo 80/443 públicos; secretos por variables de
      entorno (`.env.prod` fuera del repo). Criterio: `docker compose -f docker-compose.prod.yml config`
      valida la definición y la app responde por HTTP local en el servidor (health 200).
- [ ] **I8.4 Proxy inverso Nginx y enrutamiento (ARQ-3).** Nginx termina TLS, redirige HTTP→HTTPS y enruta
      `<dominio>/` → frontend y `<dominio>/api/` → backend (incluidos los endpoints del middleware).
      Criterio: curl por HTTP al dominio entrega la app y `<dominio>/api/health` responde 200 vía proxy.
- [ ] **I8.5 Certificados SSL/TLS Let's Encrypt (ARQ-3).** Emisión del certificado para `<dominio>` con
      Certbot integrado al Nginx; renovación automática programada y verificada (dry-run). Criterio:
      `curl -I https://<dominio>` responde 200 con certificado válido de Let's Encrypt (sin errores de
      cadena ni advertencias de "Sitio no seguro") y HTTP redirige a HTTPS.
- [ ] **I8.6 Operación de producción.** Healthchecks por servicio, logs accesibles, backup periódico de
      PostgreSQL fuera del contenedor y procedimiento de restauración documentado en `/infra`. Criterio:
      smoke final vía `https://<dominio>` (login + recorrido básico) y backup restaurable verificado en un
      ambiente de prueba.
- [ ] **I8.7 Recorrido integral HTTPS (cierre de v1).** E2E completa contra producción vía HTTPS (login →
      crear orden → middleware simulado GET/PUT → estado "Sincronizada" en panel admin; ver X7.5). Criterio:
      el recorrido pasa 100% por HTTPS con certificado válido, sin advertencias del navegador.

**Gate F8 (v1 desplegado):** dominio oficial resuelto y con HTTPS válido (Let's Encrypt), proxy enrutando
frontend y API, recorrido integral pasando por HTTPS, backup verificado y checklist de la fase en verde.

---

## Notas de ejecución

- Un ítem = un commit (o PR pequeño): código + su prueba en el mismo cambio. No mezclar ítems en un commit.
- TDD recomendado por ítem: escribir la prueba → verla fallar → implementar → verla pasar (el "Criterio" de
  cada ítem describe qué debe validar esa prueba).
- No adelantar fases: el Gate de cada fase debe estar verde antes de abrir la siguiente.
- Cualquier desviación de RF o de las reglas R1–R8 se registra en los anexos del TXT (o como entrada de
  decisión fechada) y se comunica al dueño; nunca se cambia en silencio.
- Comandos de desarrollo, prueba y build: ejecutar SIEMPRE dentro de los contenedores (ARQ-2), p. ej.
  `docker compose exec api npm test`; no asumir Node/npm instalados en el host.
