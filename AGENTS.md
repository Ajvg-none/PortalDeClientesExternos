# AGENTS.md — Portal de Clientes Externos

Guía de trabajo para agentes de IA (o personas) que intervengan en este proyecto.

## 1. Fuente de verdad (leer SIEMPRE primero)

- El documento maestro del proyecto es **`INFORMACION DEL PROYECTO.txt`** (raíz del proyecto).
  Contiene: stack tecnológico, requisitos funcionales **RF-01 … RF-56**, análisis de pantallas/frontend,
  esquema SQL de PostgreSQL y los **anexos autoritativos**: puntos críticos (v1), decisiones de negocio y
  seguridad (v1.1), pilares técnicos de arquitectura modular, Docker y despliegue/SSL (v1.2), decisión
  TypeScript (v1.3) y diseño visual/UI-UX (v1.4).
- Regla: **antes de tocar código, proponer cambios o responder preguntas técnicas, leer el TXT completo.**
- Los **anexos del TXT son autoritativos**: aclaran y deciden puntos críticos, decisiones de negocio y
  pilares técnicos, y prevalecen ante ambigüedades del cuerpo del documento. Si detectas una contradicción,
  mandan los anexos.
- **No duplicar** la información del TXT en otros archivos: referencia el TXT. Este AGENTS.md solo resume
  contexto y reglas operativas para el agente.
- Estado actual del proyecto: **Fase 1 completada y verificada** (rama `rama-alejandro`): esqueleto modular
  TypeScript (backend/frontend), entorno Docker de desarrollo, migración inicial Prisma aplicada, API modular
  con `/api/health` y suites de test en verde. La documentación del TXT sigue siendo la fuente de verdad de
  requisitos y decisiones; los anexos registran las actualizaciones.
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

## 6. Modelo de datos — esquema completo (Fase 1, B1.3)

Las tablas `users`, `api_keys` y `orders` replican el esquema SQL del TXT **más el delta del anexo v1.1
(DEC-6: `users.must_change_password`)**. La fuente autoritativa en ejecución es `backend/prisma/`
(`schema.prisma` + migraciones que `prisma migrate deploy` aplica al arrancar el contenedor); este apartado
es un snapshot documental de la Fase 1 (migración `20260903202850_init`).

- Convenciones: columnas snake_case en BD; `TIMESTAMPTZ` (UTC); enums mapeados `user_role` y `sync_status`.
- Restricciones extra vs. el modelo Prisma (solo existen en el DDL aplicado): CHECK de `treatment` y de
  `mount_type` con las strings exactas del anexo (R6), añadidas a la migración inicial.
- Índice compuesto FIFO `(sync_status, created_at, id)` (R3/PC-2) para el endpoint de pendientes
  `GET /api/external-orders/pending` — existe en `schema.prisma` y en el DDL; verificado por el test de
  integración B1.3 (incluida la definición exacta `indexdef`).
- **No cambiar el modelo silenciosamente**: cualquier cambio de esquema requiere nueva migración, actualizar
  este snapshot y anotar la decisión en el anexo del TXT.
- **Delta 2026-09 (remediación REM-2026-09/R2.2):** `users.updated_at` y `orders.updated_at` llevan
  `@updatedAt` en Prisma para que reflejen la última modificación real de la fila. Es un atributo solo de
  Prisma: **el DDL y la migración `20260903202850_init` no cambian** (mismo `DEFAULT CURRENT_TIMESTAMP`); el
  snapshot del modelo en 6.1 queda actualizado, el SQL de 6.2 intacto.

### 6.1 `backend/prisma/schema.prisma` (modelo Prisma — tipos de datos)

```prisma
// ============================================================
// Prisma schema - Portal de Clientes Externos (Fase 1, B1.3)
// Espejo del esquema SQL de INFORMACION DEL PROYECTO.txt MAS el
// delta del anexo v1.1 (DEC-6): users.must_change_password.
// Enums mapeados a user_role / sync_status; columnas snake_case.
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CLIENTE_EXTERNO
  LABORATORIO
  ADMINISTRADOR

  @@map("user_role")
}

enum SyncStatus {
  PENDIENTE
  SINCRONIZADA

  @@map("sync_status")
}

model User {
  id                 BigInt   @id @default(autoincrement())
  username           String   @unique @db.VarChar(100)
  passwordHash       String   @map("password_hash") @db.VarChar(255)
  email              String?  @unique @db.VarChar(255)
  role               UserRole
  companyName        String?  @map("company_name") @db.VarChar(255)
  phone              String?  @db.VarChar(50)
  address            String?  @db.Text
  isActive           Boolean  @default(true) @map("is_active")
  // Delta anexo v1.1 (DEC-6): cambio obligatorio de contrasena en primer acceso
  mustChangePassword Boolean  @default(true) @map("must_change_password")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  orders             Order[]

  @@map("users")
}

model ApiKey {
  id          Int      @id @default(autoincrement())
  keyValue    String   @unique @map("key_value") @db.VarChar(255)
  description String?  @db.VarChar(255)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  @@map("api_keys")
}

model Order {
  id                          BigInt    @id @default(autoincrement())
  // DEFAULT gen_random_uuid() a nivel BD (igual que el SQL del TXT)
  externalId                  String    @unique @default(dbgenerated("gen_random_uuid()")) @map("external_id") @db.Uuid
  orderNumber                 String    @unique @map("order_number") @db.VarChar(100)
  company                     String    @db.VarChar(255)
  patient                     String    @db.VarChar(255)

  // Formula optica Ojo Derecho (OD)
  odSphere                    Decimal?  @map("od_sphere") @db.Decimal(6, 2)
  odCylinder                  Decimal?  @map("od_cylinder") @db.Decimal(6, 2)
  odAxis                      Decimal?  @map("od_axis") @db.Decimal(6, 2)
  odAddition                  Decimal?  @map("od_addition") @db.Decimal(6, 2)
  odDnp                       Decimal?  @map("od_dnp") @db.Decimal(6, 2)
  odHeight                    Decimal?  @map("od_height") @db.Decimal(6, 2)
  odProductCode               String?   @map("od_product_code") @db.VarChar(100)

  // Formula optica Ojo Izquierdo (OI)
  oiSphere                    Decimal?  @map("oi_sphere") @db.Decimal(6, 2)
  oiCylinder                  Decimal?  @map("oi_cylinder") @db.Decimal(6, 2)
  oiAxis                      Decimal?  @map("oi_axis") @db.Decimal(6, 2)
  oiAddition                  Decimal?  @map("oi_addition") @db.Decimal(6, 2)
  oiDnp                       Decimal?  @map("oi_dnp") @db.Decimal(6, 2)
  oiHeight                    Decimal?  @map("oi_height") @db.Decimal(6, 2)
  oiProductCode               String?   @map("oi_product_code") @db.VarChar(100)

  // Tratamiento (seleccion unica; CHECK agregado en la migracion)
  treatment                   String?   @db.VarChar(50)
  // Tipo de montura (seleccion unica; CHECK agregado en la migracion)
  mountType                   String?   @map("mount_type") @db.VarChar(50)
  mountBrand                  String?   @map("mount_brand") @db.VarChar(100)
  mountModel                  String?   @map("mount_model") @db.VarChar(100)
  mountColor                  String?   @map("mount_color") @db.VarChar(100)

  // Coloracion
  colorationColor             String?   @map("coloration_color") @db.VarChar(100)
  colorationUnicolor          Boolean   @default(false) @map("coloration_unicolor")
  colorationDegradadoPercent  Decimal?  @map("coloration_degradado_percent") @db.Decimal(5, 2)

  observations                String?   @db.Text

  // Sincronizacion (solo 2 estados en v1, regla R2)
  syncStatus                  SyncStatus @default(PENDIENTE) @map("sync_status")
  syncedAt                    DateTime?  @map("synced_at") @db.Timestamptz(6)

  // Auditoria / propiedad
  createdBy                   BigInt?   @map("created_by")
  creator                     User?     @relation(fields: [createdBy], references: [id])
  createdAt                   DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                   DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@index([company], map: "idx_orders_company")
  @@index([syncStatus], map: "idx_orders_sync_status")
  @@index([createdBy], map: "idx_orders_created_by")
  @@index([createdAt(sort: Desc)], map: "idx_orders_created_at")
  // Indice compuesto para el endpoint de pendientes (R3 / PC-2)
  @@index([syncStatus, createdAt, id], map: "idx_orders_sync_status_created_at_id")
  @@map("orders")
}
```

### 6.2 DDL SQL aplicado — migración `20260903202850_init` (PostgreSQL 16)

```sql
-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('PENDIENTE', 'SINCRONIZADA');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "role" "user_role" NOT NULL,
    "company_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "key_value" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "external_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" VARCHAR(100) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "patient" VARCHAR(255) NOT NULL,
    "od_sphere" DECIMAL(6,2),
    "od_cylinder" DECIMAL(6,2),
    "od_axis" DECIMAL(6,2),
    "od_addition" DECIMAL(6,2),
    "od_dnp" DECIMAL(6,2),
    "od_height" DECIMAL(6,2),
    "od_product_code" VARCHAR(100),
    "oi_sphere" DECIMAL(6,2),
    "oi_cylinder" DECIMAL(6,2),
    "oi_axis" DECIMAL(6,2),
    "oi_addition" DECIMAL(6,2),
    "oi_dnp" DECIMAL(6,2),
    "oi_height" DECIMAL(6,2),
    "oi_product_code" VARCHAR(100),
    "treatment" VARCHAR(50),
    "mount_type" VARCHAR(50),
    "mount_brand" VARCHAR(100),
    "mount_model" VARCHAR(100),
    "mount_color" VARCHAR(100),
    "coloration_color" VARCHAR(100),
    "coloration_unicolor" BOOLEAN NOT NULL DEFAULT false,
    "coloration_degradado_percent" DECIMAL(5,2),
    "observations" TEXT,
    "sync_status" "sync_status" NOT NULL DEFAULT 'PENDIENTE',
    "synced_at" TIMESTAMPTZ(6),
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_value_key" ON "api_keys"("key_value");

-- CreateIndex
CREATE UNIQUE INDEX "orders_external_id_key" ON "orders"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_company" ON "orders"("company");

-- CreateIndex
CREATE INDEX "idx_orders_sync_status" ON "orders"("sync_status");

-- CreateIndex
CREATE INDEX "idx_orders_created_by" ON "orders"("created_by");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_sync_status_created_at_id" ON "orders"("sync_status", "created_at", "id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints del esquema del TXT (anexo R6: strings identicas en
-- formulario, BD y JSON)
ALTER TABLE "orders" ADD CONSTRAINT "orders_treatment_check" CHECK ("treatment" IS NULL OR "treatment" IN ('ECO (AR Verde)', 'OCEAN (AR Azul)', 'SOLERX SILVER', 'SOLERX BLUE'));
ALTER TABLE "orders" ADD CONSTRAINT "orders_mount_type_check" CHECK ("mount_type" IS NULL OR "mount_type" IN ('METAL ARO COMPLETO', 'METAL SEMI-AEREA', 'PASTA ARO COMPLETO', 'PASTA SEMI-AEREA', 'AL AIRE'));
```

## 7. Frontend (resumen de lo planificado)

- Pantallas por rol según el TXT (login → dashboard según rol; listados/detalles; formulario de orden con
  resumen-modal previo al envío; gestión de usuarios + dashboard de estadísticas para admin; 404).
- Decisiones UI/UX ya tomadas (página vs. modal) están documentadas en el TXT — respetarlas.
- **Diseño visual (anexo v1.4 del TXT):** tokens de color (dorado #9E7E47, hover #856837, texto #222222/
  #444444/#6E6E6E, canvas #F8F9FA, superficies #FFFFFF), tipografía Montserrat (400–700), **Top Header
  Layout de 64px sin sidebar** (logo CROVEN, menú horizontal por rol, perfil a la derecha), tarjetas
  rounded-xl con sombras suaves, botones de 42px en dorado, badges (PENDIENTE dorado / SINCRONIZADA verde,
  ERROR reservado) e iconos Lucide teñidos en dorado.
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

## 10. Ver la base de datos en pgAdmin (entorno local)

### 10.1 Registrar el servidor en pgAdmin

Datos exactos tal como los publica `infra/docker-compose.yml` (servicio `db`, PostgreSQL 16):

| Campo pgAdmin | Valor |
|---|---|
| Nombre del servidor (etiqueta libre) | `Portal de Clientes Externos (dev)` |
| Host / dirección | `localhost` |
| Puerto | `5432` |
| Base de datos de mantenimiento | `portal` |
| Usuario | `portal` |
| Contraseña | `portal` |
| SSL | `disable` (solo local; en producción va por red privada) |

Al conectar, en el explorador (Servers → Portal de Clientes Externos (dev) → Databases) verás **dos bases**:

- **`portal`** — base de desarrollo (la usa la API vía `DATABASE_URL`).
- **`portal_test`** — base de pruebas (la resetea `npm run test:integration` cada vez que corre la suite).

> ⚠️ Aclaración sobre los nombres: los nombres reales son **`portal`** y **`portal_test`** (los define
> `POSTGRES_DB` y el init script de `infra/db/init/`). No existe una base llamada "portal_db"; si algún día se
> quisiera otro nombre se cambiaría en `docker-compose.yml` y se recrearía el volumen.

**Valores verificados en vivo** (comandos de diagnóstico con su salida real):

- `docker compose -f infra/docker-compose.yml ps` → `portal-db` healthy, puertos `0.0.0.0:5432->5432/tcp`
- `docker exec portal-db env` → `POSTGRES_USER=portal`, `POSTGRES_PASSWORD=portal`, `POSTGRES_DB=portal`
- Bases existentes: `portal`, `portal_test`, `postgres`

### 10.1.1 Paso a paso: registrar un **Nuevo Servidor** en pgAdmin

1. En pgAdmin: menú **Object ▸ Register ▸ Server…** (o clic derecho sobre **Servers** ▸ **Register ▸ Server…**).
2. Pestaña **General**: `Name = Portal de Clientes Externos (Docker)` (etiqueta libre).
3. Pestaña **Connection** (datos exactos del contenedor):
   | Campo | Valor |
   |---|---|
   | Host name/address | `localhost` (o `127.0.0.1`) |
   | Port | `5432` |
   | Maintenance database | `postgres` (recomendado; `portal` también funciona) |
   | Username | `portal` |
   | Password | `portal` |
   | Save password | opcional |
   | SSL mode | `disable` |
4. **Save**. En el explorador: **Servers ▸ Portal de Clientes Externos (Docker) ▸ Databases** → verás **`portal`** y **`portal_test`**.

### 10.1.2 Diagnóstico: la conexión "PostgreSQL 18" existente

- Esa conexión apunta a **otro servidor local** (p. ej. un PostgreSQL 18 nativo instalado en tu PC), **no** al
  contenedor Docker (que corre PostgreSQL 16). Por eso no muestra `portal` ni `portal_test`.
- **No hay que modificarla ni eliminarla**: basta con registrar el servidor **nuevo** del paso 10.1.1.
- Si el nuevo servidor no conecta:
  1. Confirmar que el contenedor esté arriba: `docker compose -f infra/docker-compose.yml up -d db` y revisar `docker compose ps`.
  2. Probar el puerto desde Windows: `Test-NetConnection 127.0.0.1 -Port 5432`.
  3. Si el puerto `5432` lo está usando el PostgreSQL nativo (conflicto), cerrarlo o relanzar el contenedor en
     otro puerto y usar ESE puerto en pgAdmin:
     ```powershell
     $env:POSTGRES_PORT = "5433"
     docker compose -f infra/docker-compose.yml up -d db   # publica 5433:5432
     # En pgAdmin: Port = 5433
     ```

### 10.2 Detalles de red Docker (qué usar y qué no)

- Los contenedores conversan por la **red interna de compose**: dentro de esa red la API alcanza la BD con el
  host `db` (nombre de servicio) o `portal-db` (`container_name`). Ese host **solo** existe dentro de la red.
- pgAdmin instalado en tu Windows **no está en esa red**: por eso se conecta por `localhost` + el puerto
  **publicado** en el host (mapeo `ports: "${POSTGRES_PORT:-5432}:5432"`). El puerto publicado por defecto es
  `5432`.
- **No usar** el host `db` ni la IP interna del contenedor desde pgAdmin local: no se resuelven fuera de la red.
- Si pgAdmin corriera dentro de Docker (en vez de en Windows), debería unirse a la misma red del compose
  (`portal-clientes-externos_default`) y entonces sí conectar a `db:5432`.
- Prerrequisito: el contenedor `portal-db` debe estar arriba:
  ```powershell
  docker compose -f infra/docker-compose.yml up -d db
  docker compose -f infra/docker-compose.yml ps
  ```
- **Puerto 5432 ocupado** (p. ej. por otro PostgreSQL local): relanzar con otro puerto y conectar con ese valor:
  ```powershell
  $env:POSTGRES_PORT = "5433"
  docker compose -f infra/docker-compose.yml up -d db   # publica 5433:5432
  # En pgAdmin: puerto 5433
  ```
- La contraseña maestra que pide pgAdmin en el primer arranque es solo para guardar sus configuraciones
  locales; **no** es la contraseña de la base (que es `portal`).
