# Seguridad — SumarImpacto 1.2

Este documento describe las amenazas consideradas, el control que las mitiga, dónde está implementado y qué
prueba lo verifica. También deja explícito lo que **no** cubre.

## 1. Activos y supuestos

**Qué se protege:** datos de donantes y donaciones, comprobantes de gasto, presupuestos y saldos, cuentas de
usuario y la integridad del circuito de rendición.

**Supuestos:** la aplicación se sirve por HTTPS en producción (el hosting termina TLS); MongoDB no está
expuesto a Internet; los secretos se configuran por variables de entorno y no se versionan.

## 2. Amenazas, controles y verificación

| # | Amenaza | Control | Implementación | Verificación |
| --- | --- | --- | --- | --- |
| 1 | Acceso sin autenticar | JWT firmado con `issuer`/`audience`; la API responde 401 y la web redirige a `/login` | `middleware/auth.js`, `config/passport.js` | `seguridad.http`, `app` |
| 2 | Uso de un secreto JWT conocido | **No existe secreto por defecto**: si falta la variable, la autenticación falla; el servidor no inicia con secretos cortos o iguales | `config/passport.js`, `config/security.js`, `server.js` | `seguridad.http` |
| 3 | Escalada de privilegios | Grupos de permisos centralizados, comprobados en cada petición contra el usuario y rol **actuales** en la base | `config/permisos.js`, `permitirGrupo` | `permisos` (matriz contra referencia versionada), `integration` |
| 4 | Acceso a datos de otra organización | Alcance por organización para referentes, en un único método | `ProyectoService.validarAcceso` | `servicios`, `integration` |
| 5 | Datos de donantes visibles a roles no autorizados | La web **no consulta** las donaciones para roles sin permiso; la API responde 403 | `viewsController.detalleProyecto` | `integration.v12`, `vistas` |
| 6 | Fuerza bruta de contraseñas | 8 intentos fallidos de login cada 15 minutos por IP; 10 de cambio de contraseña | `middleware/rateLimiters.js` | revisión de código (sin prueba automatizada) |
| 7 | Enumeración de usuarios | Mismo mensaje y **tiempo equivalente**: se compara contra un hash de relleno si el email no existe | `config/passport.js` | revisión de código |
| 8 | Contraseñas débiles | Política única (12–72 caracteres, cuatro clases, sin el nombre de usuario); se aplica en API, web y scripts | `utils/politicaPassword.js` | `politicaPassword`, `servicios` |
| 9 | Credencial inicial conocida | Las cuentas nuevas o restablecidas **deben cambiar** la contraseña antes de usar el sistema | `middleware/auth.js`, `UsuarioService` | `seguridad.http`, `integration.v12` |
| 10 | Robo de contraseñas almacenadas | `bcrypt` con 12 rondas; el hash nunca se devuelve (`select: false`) | `models/Usuario.js` | `integration` |
| 11 | Robo o reutilización de refresh token | Rotación en cada uso; solo se guarda su hash; se invalida al cambiar contraseña, rol o estado | `authController`, `UsuarioService` | `integration`, `integration.v12` |
| 12 | CSRF | Cookies `SameSite=Strict` + verificación de `Origin` en toda escritura (el propio sitio siempre se admite) | `middleware/securityHeaders.js` | `seguridad.http`, `app` |
| 13 | XSS | CSP `default-src 'self'` y `script-src 'self'` (sin scripts ni manejadores en línea); Pug escapa por defecto; cookies `HttpOnly` | `securityHeaders.directivasCSP`, `public/js/app.js` | `seguridad.http`, `vistas` |
| 14 | Clickjacking | `frame-ancestors 'none'` | CSP | `seguridad.http` |
| 15 | Inyección de operadores NoSQL | Rechazo de claves `$…` y con `.` en cuerpo, query y parámetros; validación de tipos por ruta | `middleware/sanitizeInput.js` | `utilidades`, `seguridad.http` |
| 16 | Asignación masiva (mass assignment) | Los controladores copian solo una lista cerrada de campos | `*Controller.js` (`datosDelCuerpo`) | `servicios` |
| 17 | Datos privados en caché del navegador o de proxies | `Cache-Control: no-store` en todo lo dinámico (los estáticos sí se cachean) | `middleware/securityHeaders.sinCache` | `seguridad.http` |
| 18 | Archivos maliciosos | Máximo 5 MB; tipo MIME **y firma binaria**; formatos acotados; `nosniff` al servirlos | `middleware/upload.js`, `adminController.descargarComprobante` | `integration` |
| 19 | Fuga de información en errores | Respuestas uniformes; sin stack ni detalles internos en producción | `middleware/errorHandler.js` | `integration` |
| 20 | Superación del saldo por solicitudes simultáneas | Exclusión mutua por proyecto entre «calcular saldo» y «crear gasto» | `utils/mutex.js`, `RendicionService` | `utilidades`, `integration.v12` |
| 21 | Doble resolución de una rendición | Exclusión mutua + concurrencia optimista (`__v`) → `409` | `RendicionService`, `models/Gasto.js` | `integration.v12` |
| 22 | Alteración de rendiciones aprobadas | Los gastos no se editan ni eliminan; las donaciones y el presupuesto no pueden modificarse si dejarían rendiciones inconsistentes | `DonacionService`, `reglasProyecto` | `utilidades`, `servicios` |
| 23 | Repudio («yo no lo hice») | Bitácora de toda escritura, accesos a comprobantes/reportes e intentos de ingreso, **sin guardar cuerpos** | `middleware/auditoria.js`, `models/Auditoria.js` | `auditoria`, `seguridad.http`, `integration.v12` |
| 24 | Abuso de la cuenta del administrador | No puede desactivarse, cambiarse el rol ni restablecerse la contraseña a sí mismo; siempre debe quedar un administrador activo; sus escrituras quedan en la bitácora | `UsuarioService` | `servicios`, `integration.v12` |
| 25 | Pérdida de acceso del único administrador | Recuperación por consola, con contraseña por variable de entorno (no queda en el historial) | `scripts/reset-password.js` | revisión de código |
| 26 | Contenedor comprometido | Imagen multietapa solo con dependencias de producción; ejecución como usuario no root | `Dockerfile` | revisión |

## 3. Decisiones que conviene conocer

- **El administrador no carga ni resuelve rendiciones**, pero sí administra datos maestros (usuarios,
  organizaciones, proyectos, donantes y donaciones) para poder operar ante contingencias. La separación de
  funciones se garantiza donde importa (el circuito de control) y el resto queda **trazado** por la bitácora.
  Si se prefiere un criterio más estricto, basta con quitar el rol de los grupos `GESTION_FINANCIERA` y
  `BAJA_REGISTROS` en `src/config/permisos.js`; la prueba de permisos señalará el cambio para actualizar la
  referencia (y habría que ajustar las pruebas de integración que usan al administrador para crear donaciones).
- **No hay recuperación de contraseña por correo** (las notificaciones por correo se retiraron del alcance). La
  alternativa es el restablecimiento por un administrador, que obliga a elegir una contraseña nueva.
- **Una sesión renovable por persona:** el refresh token es único; iniciar sesión en otro dispositivo invalida el
  anterior. Es más simple y estricto; permitir varias sesiones requeriría guardar una lista de hashes.
- **Los comprobantes se sirven sin CSP**: son PDF o imágenes validados por firma y se envían con `nosniff`; la
  política de la aplicación se retira de esa única respuesta para que el visor del navegador pueda mostrarlos.

## 4. Lo que este trabajo no cubre

- Autenticación de dos factores y cierre remoto de sesiones.
- Exclusión mutua y límites de tasa **distribuidos** (hoy son por instancia).
- Retención automática de la bitácora y firma o inmovilización de sus registros.
- Cifrado de los datos en reposo a nivel de aplicación (se delega en el cifrado del servicio de base de datos).
- Análisis de dependencias continuo más allá de `npm audit` informativo en CI.
- Pruebas de penetración.

## 5. Cómo verificar

```bash
npm run check      # sintaxis y plantillas
npm test           # incluye permisos, seguridad HTTP, auditoría, servicios e integración
npm run permisos   # imprime la matriz de permisos vigente
```
