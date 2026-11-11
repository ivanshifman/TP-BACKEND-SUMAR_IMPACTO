# Plan y evidencia de pruebas — SumarImpacto 1.2

## Estrategia

La suite combina cuatro niveles, de menor a mayor costo de ejecución:

| Nivel | Suites | Base de datos |
| --- | --- | :---: |
| **Unitarias (reglas puras)** | `reglasRendicion`, `politicaPassword`, `utilidades` | No |
| **Unitarias de servicios** (modelos sustituidos por stubs) | `servicios` | No |
| **Componente** (middleware, vistas, matriz de permisos, HTTP real con acceso a datos sustituido) | `auditoria`, `vistas`, `permisos`, `seguridad.http`, `app` | No |
| **Integración** (MongoDB temporal y aislado) | `integration`, `integration.v12` | Sí |

Las pruebas que no necesitan base de datos son rápidas y se ejecutan en cualquier entorno, incluido CI. Las de
integración verifican la persistencia real y la concurrencia.

```bash
npm test                 # todo
npm run test:watch       # modo observación
npm run test:coverage    # cobertura en coverage/ (HTML en coverage/lcov-report/index.html)
npm run check            # sintaxis JavaScript y compilación de plantillas Pug
npm run permisos         # imprime la matriz de permisos vigente
```

No se requieren credenciales, `.env` ni Atlas. `mongodb-memory-server-core` descarga una versión de MongoDB la
primera vez que se ejecuta la integración; el binario queda en la caché del usuario y no se agrega al
repositorio. En cada `push` y `pull request`, GitHub Actions ejecuta `npm run check` y `npm test`.

## Estado de verificación de esta revisión

Esta tabla distingue lo que se **ejecutó** durante la revisión de lo que el equipo debe **ejecutar y registrar**.

| Control | Estado | Detalle |
| --- | --- | --- |
| `npm run check` | Ejecutado | Sintaxis correcta en 68 archivos JavaScript; 25 plantillas Pug compiladas. |
| Suites sin base de datos | Ejecutadas con un ejecutor mínimo compatible con la API de Jest | 126 de 126 pruebas correctas, cada archivo en un proceso aislado: `reglasRendicion` (12), `politicaPassword` (8), `utilidades` (28), `permisos` (7), `auditoria` (9), `servicios` (26), `vistas` (16) y `seguridad.http` (20). |
| `app.test.js` | Verificado de forma equivalente | Sus cuatro aserciones se replicaron con `fetch` (salud degradada, API protegida, redirección a login, origen no confiable). |
| Contrato OpenAPI | Ejecutado | Las 39 rutas reales de la API están documentadas y no hay rutas documentadas inexistentes. |
| Matriz de permisos | Ejecutado | Las 82 rutas de la versión anterior conservan exactamente los mismos permisos; solo se agregaron las rutas nuevas. |
| `integration.test.js` e `integration.v12.test.js` | **Pendiente** | Requieren MongoDB (descarga del binario). No se pudieron ejecutar en el entorno de revisión. |
| `npm test` con Jest | **Pendiente** | Ejecutarlo en una máquina del equipo y registrar el resultado más abajo. |
| `npm run test:coverage` | **Pendiente** | Medir la cobertura tras ejecutar la suite completa. |
| `npm audit --omit=dev` | **Pendiente** | Volver a ejecutarlo; se retiraron dependencias. |

> El ejecutor mínimo usado en la revisión no es Jest. Replica `describe`, `test`, `expect` y los hooks, pero el
> registro oficial de la entrega debe hacerse con `npm test`.

## Registro de evidencia (completar antes de la entrega)

| Fecha | Responsable | Entorno (SO, Node) | `npm run check` | `npm test` | Cobertura | Observaciones |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## Matriz de casos

Los casos están automatizados; la columna «Suite» indica dónde. El resultado se registra con `npm test`.

### Autenticación y cuentas

| ID | Caso | Suite |
| --- | --- | --- |
| AUTH-01–05 | Login correcto e incorrecto, access vencido, rotación y repetición del refresh token, usuario inactivo, logout | `integration` |
| AUTH-06 | Respuesta 401 de la API y redirección de la web sin sesión | `seguridad.http`, `app` |
| AUTH-07 | Email insensible a mayúsculas; las cuentas Gmail conservan sus puntos | `utilidades`, `integration.v12` |
| ACC-01 | Política de contraseñas (longitud, cuatro clases, nombre de usuario, tope de 72 bytes) | `politicaPassword`, `servicios` |
| ACC-02 | La cuenta nueva solo puede cambiar la contraseña; al hacerlo recupera el acceso y se cierran las otras sesiones | `seguridad.http`, `integration.v12` |
| ACC-03 | Restablecimiento por el administrador y cambio obligatorio posterior | `servicios`, `integration.v12` |
| ACC-04 | El administrador no puede desactivarse, cambiarse el rol ni restablecerse la contraseña | `servicios`, `integration.v12` |
| ACC-05 | El cambio de rol u organización cierra las sesiones; el referente exige organización | `servicios`, `integration.v12` |

### Permisos

| ID | Caso | Suite |
| --- | --- | --- |
| AUTHZ-01–03 | Matriz de roles, alcance del referente, lectura administrativa y prohibición de aprobar como administrador | `integration` |
| AUTHZ-04 | La matriz completa de rutas y roles coincide con la referencia versionada | `permisos` |
| AUTHZ-05 | Los grupos inexistentes fallan; todos los grupos usan roles válidos | `permisos` |
| AUTHZ-06 | El menú y los botones muestran solo lo que el rol puede usar | `vistas`, `seguridad.http` |
| AUTHZ-07 | El referente no recibe datos de donantes ni por la API ni por la web | `integration.v12`, `vistas` |

### Seguridad HTTP

| ID | Caso | Suite |
| --- | --- | --- |
| SEC-01 | CSP estricta, `no-store`, `Referrer-Policy`, sin `X-Powered-By`; los estáticos se cachean | `seguridad.http` |
| SEC-02 | Sin manejadores en línea en el HTML | `seguridad.http`, `vistas` |
| SEC-03 | Rechazo de operadores de MongoDB en cuerpo y query | `utilidades`, `seguridad.http` |
| SEC-04 | Escrituras de origen no confiable rechazadas; las del propio sitio admitidas | `seguridad.http`, `app` |

### Rendición de gastos

| ID | Caso | Suite |
| --- | --- | --- |
| RF01-01–03 | PDF/JPG/PNG/WEBP con firma, falta de archivo, MIME o contenido incorrecto, archivo mayor a 5 MB, rubro y período inválidos | `integration` |
| RF01-04 | Fecha futura y monto fuera de rango | `integration.v12` |
| RF02-01–06 | Autoaprobación, tope mensual, Auditoría, Mesa, auto-revisión y saldo insuficiente | `reglasRendicion`, `integration` |
| RF02-07 | Dos rendiciones simultáneas no superan el saldo | `utilidades`, `integration.v12` |
| RF02-08 | Dos revisiones simultáneas de la misma rendición se resuelven una sola vez | `integration.v12` |

### Proyectos, donaciones y campañas

| ID | Caso | Suite |
| --- | --- | --- |
| PRY-01 | Un proyecto inactivo no recibe donaciones ni rendiciones y puede reactivarse | `servicios`, `integration.v12` |
| PRY-02 | No se reduce el presupuesto ni un rubro por debajo de lo rendido, ni se quita un rubro con rendiciones | `utilidades`, `servicios`, `integration.v12` |
| DON-01 | Fecha futura y monto fuera de rango | `servicios`, `integration.v12` |
| DON-02 | Campañas finalizadas o fuera de período, incluido el último día completo | `servicios`, `integration.v12` |
| DON-03 | Una donación de un proyecto con rendiciones no se modifica ni elimina | `servicios`, `integration.v12` |
| RF04-01 | Agregación de campaña, render y PDF | `integration` |
| RF04-02 | El reporte incluye las donaciones del último día de la campaña | `utilidades`, `integration.v12` |

### Bitácora y errores

| ID | Caso | Suite |
| --- | --- | --- |
| AUD-01 | Qué se audita (escrituras, comprobantes y reportes) y qué no | `auditoria` |
| AUD-02 | Registro con autor, ruta sin query e id del recurso; un fallo de registro no rompe la solicitud | `auditoria` |
| AUD-03 | Intentos de ingreso fallidos y solicitudes bloqueadas quedan registrados, sin cuerpos | `seguridad.http`, `integration.v12` |
| AUD-04 | Consulta con filtros y paginación; solo administrador y Auditoría | `seguridad.http`, `integration.v12` |
| ERR-01–03 | ObjectId inválido, recurso inexistente y dato único duplicado | `integration` |
| WEB-01 | Acceso sin login a una página protegida | `app` |

## Pruebas pendientes de la entrega

- Despliegue en un entorno de staging o hosting.
- Pruebas de carga y de rendimiento.
- Grabación de evidencia audiovisual para la defensa.

## Comandos en entorno local

```bash
npm install
npm run check
npm test
npm run create-admin
npm run seed  # solo base descartable de desarrollo
npm run dev
```
