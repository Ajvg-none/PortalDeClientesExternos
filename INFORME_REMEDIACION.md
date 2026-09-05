# INFORME DE REMEDIACIÓN 2026-09 (REM-2026-09)

Revisión integral de las fases completadas (1-6) del Portal de Clientes Externos contra
`PLAN_DE_DESARROLLO.md`. Verificado en `rama-alejandro` con Docker (ARQ-2).

## 1. Línea base (antes de tocar código)

| Suite | Resultado |
|---|---|
| Backend unit (`npm run test`) | 73/73 |
| Backend integración (`npm run test:integration`) | 45/45 |
| Frontend (`npm test`) | 11/11 |
| Typecheck backend / frontend | 0 errores / 0 errores |

## 2. Hallazgos principales

**Críticos / altos (corregidos):**
1. Guard de primer acceso autoredirigente: `/cambiar-contrasena` redirigía a sí misma con
   `must_change_password=true` → pantalla inalcanzable (F6.10/DEC-6). Fix de ruteo + `RequirePasswordChange`.
2. Exportación CSV por `window.open` sin JWT → 401. Ahora descarga autenticada con `fetch` + Blob (RF-34).
3. Sesión perdida al recargar la SPA (token persistía, `user` solo en memoria). Ahora se persiste y restaura
   `AuthUser` (RF-03).
4. Formulario de orden con ~1/4 de los campos de RF-08: se completaron los ~30 campos (OD/OI completos,
   montura, coloración, observaciones) + resumen modal + mensaje de éxito al volver al listado.
5. Sin validación asíncrona de unicidad del N° de Orden: nuevo `GET /api/orders/order-number/:value`
   (solo CLIENTE_EXTERNO) y aviso en el formulario (RF-10).
6. Gestión de usuarios en UI incompleta: alta/edición/reset/filtros por rol/estado (RF-23…27, sin DELETE).
7. `test:integration` podía resetear `DATABASE_URL` por fallback; ahora exige `TEST_DATABASE_URL` y nombre
   de base terminado en `_test`.

**Medios (corregidos):**
- Overflow numérico (`DECIMAL(6,2)/(5,2)`) → 400 en vez de 500.
- `updated_at` nunca se actualizaba → `@updatedAt` de Prisma (sin cambio de DDL).
- Secretos por defecto de dev: fail-fast en `NODE_ENV=production` (`assertEnv`).
- Login: respuesta genérica + bcrypt dummy (anti-enumeración por timing) y cap de 72 en password.
- Body >1mb → 413 JSON (`entity.too.large`).
- CSV Injection: celdas que inician con `=`/`@`/tab se neutralizan (sin romper esferas negativas `-2.50`).
- Filtros por fechas interpretados en `ANALYTICS_TIMEZONE` (core/dates) en listados y exportación.
- Acoplamiento ARQ-1: `statusController`, `PublicUser/toPublicUser` y `opticalSummary` extraídos a `core`;
  eliminados 5 duplicados de `status.controller` por módulo.
- Montserrat (anexo v1.4) ahora se carga en `index.html`; labels `htmlFor` en formularios; modal con cierre
  por ESC/backdrop compartido (`shared/Modal`, `shared/Pager`); sin abuso de badges de sincronización.

**Documentado en anexos (decisiones R-2026-09-01…09):** contrato `date` en UTC (Z) aprobado; zona horaria de
filtros; `@updatedAt`; CSV; runner de tests; endpoint de unicidad; secretos; `/status`; login genérico.

## 3. Resultado final (evidencia, 2026-09-05)

| Suite | Antes | Después |
|---|---|---|
| Backend unit | 73 | **81** (13 suites) |
| Backend integración | 45 | **46** (5 suites) |
| Frontend | 11 | **28** (9 archivos) |
| Typecheck backend / frontend | OK | OK |
| `npm run build` backend / frontend | — | **OK / OK** (exit 0) |

Pruebas añadidas: rutas/sesión/primer acceso (App.test), guard flag, export autenticado, sesión en refresh,
404, detalle completo admin/cliente, alta/edición/filtros/baja/reset de usuarios, formulario completo con
unicidad, `dateToDayRange` por zona horaria, overflow numérico, 413, CSV injection, check de unicidad
(endpoint).

## 4. Estado del plan

Bloque REM-2026-09 del `PLAN_DE_DESARROLLO.md` con todos los sub-ítems en verde. Gate F6 se considera
cerrado al cumplir: suites completas sin regresiones + pruebas por ítem + sin pantallas pendientes del TXT.
Pendiente de fases 7-8 (OpenAPI, CI, E2E, producción/SSL) y del endurecimiento X7.2 (requiere OK del dueño).

## 5. Cleanup, Clean Code y revamp de UI (2026-09, rama `cleanup-ui-2026-09`)

**Cleanup (F1):** se eliminaron los endpoints sentinel `/api/<modulo>/status` (scaffold B1.4; queda
`/api/health`), se podó código muerto (`httpErrors.badRequest/internal`), se activó `noUnusedLocals`/
`noUnusedParameters`/`noFallthroughCasesInSwitch` en ambos tsconfig (los errores que afloró se corrigieron
en src y tests), se agregó `npm run clean` y se eliminaron los `dist/` locales. Anexo TXT R-2026-09-08
actualizado.

**Clean Code (F2/F3):** backend consolida la coerción numérica en `core/num.ts` y el validador de ids
BIGINT en `core/validators.ts` (elimina duplicados de orders.mapper/external-orders.serializer/
order-format y de los DTOs). Frontend tipa el detalle de orden (`EyeData`/`MountData`/`ColorationData`),
centraliza `qs()` en `core/http`, `PAGE_SIZE` en `core/constants` y quita casts/`Record<unknown>`.

**Revamp UI (F4):** design system en CSS puro (sin dependencias) según anexo v1.4 — `tokens.css` con
escalas de espacio/tipografía/estados, `base.css` (reset, foco visible, skip-link) y `components.css`
(botones 42px, tarjetas rounded-xl + sombra v1.4, tablas, formularios, badges pill, modal, grid). Todas
las pantallas (login, cambio de contraseña, listados por rol con filtros, formulario completo RF-08,
detalle, gestión de usuarios, alta/edición, estadísticas, 404) usan clases del sistema; se eliminaron los
estilos inline.

**A11y (F5):** skip-link a `main#contenido`, un `<h1>` por pantalla, landmarks, labels asociados en los
campos ópticos del formulario, `Modal` con focus trap + `aria-labelledby` + retorno de foco, y respeto de
`prefers-reduced-motion`.

**Evidencia final:** backend unit **77** + integración **46**, frontend **28**, typecheck y `npm run build`
OK en ambos, smoke en vivo (health ok, login `admin`=ADMINISTRADOR, frontend 200).

> Revisión visual pendiente del dueño: abrir `http://localhost:5173` y recorrer cada rol
> (admin/lab1/cliente2/cliente1 · `Cambiar123!`).
