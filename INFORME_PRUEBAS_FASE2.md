# Informe de Pruebas — Fase 2 (Autenticación, control de acceso y gestión de usuarios)

- **Rama:** `rama-alejandro`
- **Fecha de ejecución:** 03/09/2026
- **Alcance:** Ítems U2.1 a U2.8 del `PLAN_DE_DESARROLLO.md` (Gate F2)
- **Entorno:** contenedores Docker de desarrollo (`infra/docker-compose.yml`): API Node 20 (Express/TS), BD PostgreSQL 16 (`portal` para HTTP real, `portal_test` para integración).
- **Evidencia ejecutable:** suites en `backend/tests/*.test.ts` + llamadas HTTP reales contra `http://localhost:3000`.

---

## 1. Resumen ejecutivo — Estado del Gate F2

**Gate F2: VERDE.** Las 37 pruebas unitarias y 22 de integración pasan (59/59, exit 0 en `npm run test:all`), el typecheck compila limpio y el escenario HTTP real (16 llamadas) devuelve los códigos esperados. Se documentan además las reglas de negocio críticas verificadas (baja lógica sin DELETE, flag de primer acceso, revalidación de `is_active`).

**Hallazgo corregido durante esta ejecución:** las llamadas HTTP reales detectaron que la validación *"companyName obligatorio para CLIENTE_EXTERNO"* no se disparaba cuando el campo faltaba (`.optional()` anulaba el `.custom()`) → el alta devolvía **201 en vez de 400**. Se corrigió el DTO (`backend/src/modules/users/dto/user.dto.ts`), se agregó un **test de regresión** de integración y se revalidó por HTTP (400).

---

## 2. Matriz de cobertura U2.1–U2.8

Leyenda de tipos: **U** = unitaria (Prisma mockeado) · **I** = integración (BD `portal_test` real) · **H** = HTTP/E2E real (API en `localhost:3000`).

| Ítem | Qué cubre | U | I | H | Resultado |
|---|---|---|---|---|---|
| U2.1 | bcryptjs: hash ≠ texto plano, verify ok/fail | 2 | – | – | **PASSED** |
| U2.2 | JWT: sign/verify `sub`/`role`/`exp`; firma inválida; expirado | 3 | – | – | **PASSED** |
| U2.3 | Middleware auth: sin token 401; token válido inyecta `req.auth`; **usuario inactivo → 401**; firma inválida 401 | 4 | 2 | 2 | **PASSED** |
| U2.4 | Roles: allow ADMINISTRADOR; deny LABORATORIO/CLIENTE_EXTERNO (403); sin auth 401 | 3 | 2 | 3 | **PASSED** |
| U2.5 | Login por username: ok (token+rol+flag); pass incorrecta 401; inexistente 401; deshabilitado 403 | 4 | 2 | 3 | **PASSED** |
| U2.6 | Servicio usuarios: alta hash + flag TRUE; username duplicado 409; email 409; reset flag TRUE | 5 | 3 | 4 | **PASSED** |
| U2.7 | Endpoints admin: listado filtrable (q/role/isActive) paginado; alta 201/400/409; edición; **baja lógica**; **sin DELETE** | 3 | 5 | 4 | **PASSED** |
| U2.8 | Guard primer acceso: 403 `PASSWORD_CHANGE_REQUIRED` con flag; change-password 400 (current mal) / 200 limpia flag; clave anterior inválida tras reset | 2 | 3 | 4 | **PASSED** |

### 2.1 Pruebas unitarias (37) — detalle por archivo
- `backend/tests/security.test.ts` (U2.1/U2.2): 5 tests.
- `backend/tests/auth.middlewares.test.ts` (U2.3/U2.4/U2.8): 9 tests.
- `backend/tests/auth.service.test.ts` (U2.5/U2.8 servicio): 7 tests.
- `backend/tests/users.service.test.ts` (U2.6/U2.7 servicio): 8 tests.
- `backend/tests/app.test.ts` (B1.4 regresión): 10 tests.

### 2.2 Pruebas de integración (22) — `backend/tests/auth-flow.integration.test.ts` (12) + `db-schema.integration.test.ts` (9) + regresión DTO (1)
Persistencia real en `portal_test`: alta/edición/baja/reset de usuarios, unicidades, flag `must_change_password`, restricción de roles y de primer acceso, y esquema 1:1 (B1.3).

### 2.3 Escenario HTTP real (16 llamadas) — resultados

| # | Llamada | Esperado | Obtenido |
|---|---|---|---|
| 1 | `POST /api/auth/login` (admin) | 200 | **200** role=ADMINISTRADOR |
| 2 | `POST /api/auth/login` (pass incorrecta) | 401 | **401** |
| 3 | `GET /api/users` (admin) | 200 total=3 | **200 total=3** |
| 4 | `POST /api/users` (cliente2, CLIENTE_EXTERNO+empresa) | 201 | **201** flag=true |
| 5 | `POST /api/users` (username duplicado) | 409 | **409** |
| 6 | `POST /api/users` (CLIENTE_EXTERNO sin empresa) | 400 | **201 → 400 tras el fix** |
| 7 | `POST /api/auth/login` (cliente1, flag TRUE) | 200 flag=true | **200 flag=true** |
| 8 | `GET /api/users` con token de cliente con flag | 403 | **403** (`PASSWORD_CHANGE_REQUIRED`) |
| 9 | `POST /api/auth/change-password` (current incorrecta) | 400 | **400** |
| 10 | `POST /api/auth/change-password` (correcta) | 200 flag=false | **200 flag=false** |
| 11 | `GET /api/users` con cliente sin flag | 403 | **403** (`FORBIDDEN`, rol) |
| 12 | `GET /api/users` con token LABORATORIO | 403 | **403** |
| 13 | `PATCH /api/users/{id}/status {isActive:false}` | 200 | **200** isActive=false |
| 14 | `POST /api/auth/login` del usuario deshabilitado | 403 | **403** |
| 15 | `PATCH .../status {isActive:true}` (reactivar) | 200 | **200** isActive=true |
| 16 | `DELETE /api/users/{id}` | 404 (sin ruta) | **404** |

### 2.4 Casos de borde y errores (mapeo)

| Categoría | Código | Evidencia |
|---|---|---|
| Validaciones de entrada | **400** `VALIDATION_ERROR` (por campo) | unit + integración + HTTP #6/#9 |
| Credenciales/token inválidos o expirados | **401** `UNAUTHORIZED` | security/middlewares unit + HTTP #2 |
| Acceso denegado por rol | **403** `FORBIDDEN` | unit + integración + HTTP #11/#12 |
| Acceso denegado por flag de primer acceso | **403** `PASSWORD_CHANGE_REQUIRED` | unit + integración + HTTP #8 |
| Usuario deshabilitado | **403/401** al autenticar o usar token previo | unit + integración + HTTP #14 |
| Duplicidad de username | **409** `USERNAME_ALREADY_EXISTS` | unit + integración + HTTP #5 |
| Métodos no permitidos / rutas inexistentes | **404** JSON `NOT_FOUND` | integración (DELETE) + HTTP #16 + app.test |

---

## 3. Métricas de ejecución

| Métrica | Valor |
|---|---|
| Tests ejecutados (total) | **59** (37 unitarias + 22 integración) |
| Suites | 7 (5 unit + 2 integración), todas PASSED |
| Tiempo suite unitaria | 6,49 s |
| Tiempo suite integración | 4,96 s |
| Tiempo total `npm run test:all` | ≈ 15 s (wall clock, dentro del contenedor) |
| Cobertura de código (Jest, suite unitaria, `collectCoverageFrom=src/**/*.ts`) | Statements **76,87 %** (266/346) · Branches 44,03 % (48/109) · Functions 61,29 % (38/62) · Lines **79,57 %** (261/328) |

**Nota de método sobre cobertura:** Jest mide solo la suite unitaria (con Prisma mockeado). Los flujos HTTP y de integración ejercen controladores/endpoints contra BD real pero no se contabilizan en ese %; la verificación funcional completa queda cubierta por las suites I/H (22 tests + 16 llamadas reales). El % de branches bajo se explica por los mocks de Prisma y es un punto de mejora conocido (opcional: añadir tests de controladores con supertest en la métrica).

---

## 4. Confirmación de reglas de negocio

### 4.1 Un usuario desactivado pierde el acceso inmediatamente
- El middleware `authenticate` **relee `is_active` de la BD en cada request** (no confía solo en el JWT): token válido + usuario `is_active=false` → `401` (unit `auth.middlewares.test.ts`).
- HTTP: baja del usuario (PATCH status=false) y login posterior → `403 FORBIDDEN` (#13/#14).
- Evidencia en BD: la fila sigue existiendo con `is_active=false` tras la baja (no se elimina).

### 4.2 El flag de cambio de contraseña bloquea los endpoints no autorizados
- Guard `passwordChangeRequired`: con `must_change_password=true` todos los recursos autenticados responden `403 PASSWORD_CHANGE_REQUIRED`, salvo `POST /api/auth/change-password`.
- HTTP #8: `GET /api/users` con token de cliente con flag → 403; #10: al completar el cambio el flag pasa a `false` y el mismo token ya solo recibe `403 FORBIDDEN` por rol (#11), lo que demuestra que el bloqueo desapareció.

### 4.3 No existen borrados físicos en la base de datos
- **Código:** `git grep "\.delete(" backend/src` → sin coincidencias (los servicios solo usan `is_active=false`).
- **API:** `DELETE /api/users/:id` no tiene ruta → 404 (HTTP #16 e integración); el registro persiste después del intento.
- **BD:** en `portal` (dev) y en `portal_test` los usuarios dados de baja permanecen con `is_active=false`; solo se eliminan físicamente los datos demo por scripts explícitos de seed (`scripts/seed-demo.ts`) o el reset de BD de pruebas del runner de integración.
- **Consistencia:** la FK `orders_created_by` (`ON DELETE SET NULL`) nunca se activa por el dominio porque no existe DELETE de usuarios (DEC-4).

---

## 5. Comandos de ejecución (evidencia reproducibles)

```bash
# Suite completa dentro del contenedor (Gate F2)
docker compose -f infra/docker-compose.yml exec -T api npm run test:all   # exit 0

# Unitarias con cobertura
docker compose -f infra/docker-compose.yml exec -T api npx jest --runInBand --coverage --collectCoverageFrom='src/**/*.ts' --coverageReporters=text-summary

# Seed de usuarios demo (BD de desarrollo)
docker compose -f infra/docker-compose.yml exec -T api npx tsx scripts/seed-demo.ts
```

---

## 6. Conclusiones

1. Gate F2 verificado en los tres niveles (unitario, integración con BD real y HTTP/E2E): **59/59 tests PASSED** + 16 llamadas HTTP con códigos esperados.
2. La prueba HTTP real demostró su valor: detectó y permitió corregir la validación de `companyName` que las pruebas unitarias no veían (mock de Prisma no ejercitaba el DTO vía HTTP); quedó cubierta con test de regresión.
3. Reglas de negocio críticas (revocación inmediata de acceso, bloqueo por primer acceso, ausencia de DELETE) confirmadas por código, API y estado de BD.
4. Cobertura unitaria >75 % de líneas/statements; se recomienda (opcional) incorporar los controladores al reporte de cobertura en próximas fases para elevar branches.
