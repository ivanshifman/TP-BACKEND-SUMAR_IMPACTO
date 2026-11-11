# Red SumarImpacto — Informe técnico actualizado

**Versión:** 1.2  
**Materia:** Desarrollo Web Backend — IFTS N.º 29  
**Comisión:** A · **Grupo:** 6  
**Estado de esta revisión:** 11 de noviembre de 2026

> Este informe distingue lo que se **ejecutó y comprobó** durante la revisión de la versión 1.2 de lo que
> **sigue pendiente** de ejecutar o confirmar por el equipo (ver secciones 6 y 8). No presenta como realizados un
> despliegue público, las pruebas de integración, el video grupal ni tareas individuales que el equipo no haya
> confirmado. Debe ser revisado por todos los integrantes antes de la entrega.

## 1. Objetivo y alcance

SumarImpacto permite registrar donaciones a organizaciones sociales, asociarlas a proyectos y rendir los gastos
con comprobantes. La versión 1.2 conserva Node.js, Express, MongoDB/Mongoose y vistas Pug, y completa la gestión
de cuentas, la trazabilidad de acciones y las validaciones de negocio.

### Funcionalidades implementadas

- Autenticación con Passport Local y JWT; contraseñas protegidas con bcrypt y política de contraseñas única.
- **Gestión de cuentas:** cambio y restablecimiento de contraseña, edición de rol y organización, y cambio
  obligatorio en el primer ingreso.
- Seis roles con permisos distintos, definidos en una fuente única, y alcance por organización para referentes.
- **Bitácora de auditoría** de escrituras, accesos a comprobantes y reportes, e intentos de ingreso.
- Carga de comprobantes JPG, PNG, WEBP o PDF, con límite de 5 MB y validación de tipo y firma binaria.
- Circuito de rendición RF-02, reglas de presupuesto y revisión por Auditoría y Mesa Coordinadora, con control
  de concurrencia.
- Proyectos con estado activo/inactivo y protección del presupuesto ya rendido.
- Campañas con metas, reportes de recaudación y exportación PDF.
- Interfaz web Pug y API REST sobre los mismos servicios, con contrato OpenAPI.

### Fuera de alcance

Las notificaciones por correo a donantes (RF-03) no forman parte de esta versión: se retiraron para simplificar
el despliegue. Por eso no hay recuperación de contraseña por correo; la realiza un administrador.

## 2. Arquitectura y tecnologías

El backend usa MVC con una capa de servicios:

- **Middleware transversal:** seguridad de cabeceras (CSP, no-cache), límites de tasa, sanitización, protección de
  origen y bitácora; se aplican una sola vez antes de las rutas.
- **Rutas:** autenticación, permisos por grupo y validación de entrada.
- **Controladores:** coordinan solicitudes HTTP y respuestas JSON o Pug.
- **Servicios:** reglas de negocio de proyectos, donaciones, rendiciones, usuarios, campañas y auditoría.
- **Modelos:** persistencia e invariantes con Mongoose.
- **Utilidades puras:** política de contraseñas, reglas de rendición y de presupuesto, fechas y exclusión mutua.

| Componente | Tecnología |
|---|---|
| Runtime | Node.js (mínimo soportado: 20) |
| Framework | Express 4.22.3 |
| Persistencia | MongoDB y Mongoose 9.12.0 |
| Vistas | Pug 3.0.4 |
| Autenticación | Passport, JWT y bcryptjs |
| Validación y seguridad | express-validator, Helmet 8.3.0, CORS, express-rate-limit |
| Archivos y reportes | Multer, PDFKit |
| Pruebas | Jest 30.5.2 y Supertest 7.3.2 |
| Operación | Docker (multietapa, usuario no root) y GitHub Actions |

Las versiones instaladas quedan fijadas en `package-lock.json`; al instalar en otro entorno se debe usar `npm ci`.

## 3. Modelo y roles

El dominio incluye `Usuario`, `Organizacion`, `Proyecto`, `Donante`, `Donacion`, `Campania`, `Gasto` y
`Auditoria`. Las relaciones usan `ObjectId` y referencias de Mongoose. Los comprobantes se guardan como `Buffer`
en MongoDB.

| Rol | Responsabilidad principal |
|---|---|
| Administrador del sistema | Gestiona usuarios y datos maestros y consulta la bitácora; no carga ni resuelve rendiciones. |
| Referente territorial | Consulta proyectos de su organización y carga comprobantes. |
| Auditoría | Revisa y resuelve las rendiciones de su tramo y consulta la bitácora. |
| Mesa Coordinadora | Gestiona proyectos y campañas y resuelve rendiciones derivadas de alto monto. |
| Administración | Gestiona donantes y donaciones; consulta rendiciones en modo lectura. |
| Trabajo Social | Gestiona organizaciones y proyectos. |

La matriz completa está en el README y se protege con una prueba que compara las rutas reales con una referencia
versionada. El administrador conserva la gestión de datos maestros para poder operar ante contingencias; el
contrapeso es que toda escritura queda registrada en la bitácora.

### Circuito de rendición RF-02

La fecha del comprobante debe estar dentro del período del proyecto y no ser futura, el rubro debe estar
aprobado y el gasto no puede superar el saldo disponible. Los umbrales iniciales son 5 % para aprobación
automática y tope mensual automático, y más de 30 % para intervención de Mesa después de la revisión de
Auditoría. Los valores se configuran mediante variables de entorno y deben confirmarse con Mesa Coordinadora.
El cálculo del saldo y la creación del gasto se ejecutan en exclusión mutua por proyecto, y las revisiones usan
concurrencia optimista.

## 4. Seguridad y operación

- bcrypt con 12 rondas; política de 12 a 72 caracteres con cuatro clases; cambio obligatorio en cuentas nuevas.
- Access JWT de corta duración y refresh token rotativo; se almacena el hash del refresh token. No existe
  secreto JWT por defecto.
- Cookies `HttpOnly`, `SameSite=Strict` y `Secure` en producción; la API también acepta Bearer.
- Autorización en el servidor, aislamiento de proyectos por organización y matriz de permisos protegida por una
  prueba.
- Helmet con CSP estricta (sin scripts en línea), `Cache-Control: no-store`, protección de origen, límites de
  tasa separados por operación y rechazo de operadores de MongoDB en la entrada.
- Igualación del tiempo de respuesta del login para no revelar qué emails existen.
- Los comprobantes se validan por MIME y firma binaria y se limitan a 5 MB.
- Bitácora de auditoría sin cuerpos de solicitudes.
- Imagen de contenedor multietapa, solo con dependencias de producción y sin privilegios de administrador.

El modelo de amenazas, el control de cada una y la prueba que lo respalda están en
[`SEGURIDAD.md`](SEGURIDAD.md). Para un volumen elevado, conviene almacenar los comprobantes en almacenamiento
de objetos en lugar de MongoDB.

## 5. Instalación y configuración

1. Instalar Node.js 20 o superior y clonar el repositorio.
2. Ejecutar `npm ci`.
3. Copiar `.env.example` a `.env` y configurar `MONGODB_URI`, secretos JWT distintos de al menos 32 caracteres y
   credenciales del administrador inicial.
4. Ejecutar `npm run create-admin`. El administrador deberá cambiar su contraseña en el primer ingreso.
5. Iniciar con `npm run dev` o `npm start`. Alternativa: `docker compose up --build`.

`npm run seed` borra las colecciones del dominio antes de cargar datos de ejemplo. Debe usarse únicamente con una
base descartable de desarrollo, nunca con datos reales.

## 6. Pruebas y estado de verificación

**Verificación automatizada más reciente: 2026-11-11 (Windows, Node.js v24.17.0)**

| Verificación | Resultado |
|---|---|
| `npm run check` | Sintaxis correcta en 68 archivos JavaScript; 25 plantillas Pug compiladas. |
| `npm test` con Jest | 11 suites y 184 pruebas aprobadas, incluidas las dos suites de integración con MongoDB temporal y aislado. |
| `npm run test:coverage` | 74.39 % de sentencias, 68.42 % de ramas, 65.05 % de funciones y 76.75 % de líneas; reporte HTML en `coverage/lcov-report/index.html`. |
| `npm audit --omit=dev` y `npm audit` | Pendiente de ejecutar. |

El registro detallado de la ejecución está en [`TESTING.md`](TESTING.md). La prueba de matriz de permisos
normaliza finales de línea para Windows y Unix; las pruebas HTTP de `app.test.js` aíslan la bitácora para
no requerir MongoDB.

**Verificaciones de la versión 1.1 (históricas):** el equipo informó 0 vulnerabilidades en dependencias de
producción, 20 de severidad baja o moderada en el árbol completo (principalmente de desarrollo), respuesta
HTTP 200 en `/`, `/login` y `/health`, y conexión a MongoDB Atlas desde el entorno local. Estos resultados no
reemplazan la verificación del entorno de despliegue actual.

Las pruebas de integración usan `mongodb-memory-server-core` para persistencia aislada: no escriben en Atlas.
Siguen pendientes las pruebas de despliegue en hosting y las de carga y rendimiento.

## 7. Despliegue

No hay un despliegue público configurado o verificado al momento de esta revisión.

### Recomendación

Para el diseño actual se recomienda un Web Service Node persistente conectado a MongoDB Atlas, por ejemplo Render:

1. Conectar el repositorio y configurar `npm ci` como build y `npm start` como comando de inicio.
2. Usar `/health` como health check y el `PORT` que provea el servicio.
3. Configurar secretos en el panel del hosting, no en Git: `NODE_ENV=production`, `MONGODB_URI`, secretos JWT y,
   si hay un frontend en otro dominio, `CORS_ORIGINS`. El dominio de la propia aplicación no hace falta. Detrás
   de un proxy, `TRUST_PROXY=true`.
4. Limitar el acceso de red de Atlas a los orígenes necesarios y elegir regiones cercanas.
5. Crear el administrador desde el entorno desplegado y probar login, cambio de contraseña, permisos y flujos
   relevantes.

Como alternativa se incluye un `Dockerfile` y un `docker-compose.yml` (aplicación + MongoDB). Las instancias
gratuitas de Render pueden suspenderse por inactividad, lo que demora la primera respuesta tras reactivarse.

**Vercel** requiere adaptaciones y no fue probado: hay que exportar la app Express como handler (hoy `server.js`
abre un puerto), reutilizar la conexión a MongoDB entre invocaciones y usar un almacén compartido para el rate
limiter y la exclusión mutua, que hoy usan memoria local. `express.static()` tampoco sirve los estáticos en
Vercel; hay que usar `public/` según la integración.

Referencias oficiales: [Express en Vercel](https://vercel.com/docs/frameworks/backend/express),
[Vercel Functions](https://vercel.com/docs/functions), [Web Services de Render](https://render.com/docs/web-services)
y [limitaciones del plan gratuito de Render](https://render.com/docs/free).

## 8. Pendientes para la entrega académica

- Repetir las verificaciones en el entorno de entrega y actualizar la evidencia de `TESTING.md` si cambia el
  runtime o la configuración.
- Desplegar y comprobar la aplicación públicamente; añadir al documento final la URL HTTPS.
- Confirmar con Mesa Coordinadora los umbrales de rendición.
- Definir con la cátedra si las notificaciones por correo (RF-03) deben formar parte de esta entrega.
- Medir el rendimiento en la infraestructura objetivo; no está medido ni demostrado.
- Validar con el equipo las tareas realmente realizadas por cada integrante. No se atribuyen responsabilidades
  individuales en este informe.
- Incluir las conclusiones personales/equipo solicitadas: aprendizajes, dificultades y resolución, temas de mayor
  interés y aspectos por reforzar.
- Grabar el video grupal, verificar permisos de visualización e incluir el enlace.
- Preparar el ZIP individual solicitado y organizar la versión anterior y la actual según las indicaciones de la
  cátedra.

## 9. Uso de herramientas de IA

Se utilizó un asistente de IA como apoyo para revisar el repositorio, implementar mejoras, actualizar pruebas y
documentación y preparar esta revisión del informe. Los integrantes deben verificar las afirmaciones y los
resultados, adaptar el texto a su trabajo real y asumir las decisiones y la entrega final.

## 10. Bibliografía y enlaces

- [Node.js — ECMAScript Modules](https://nodejs.org/api/esm.html)
- [Express.js — documentación](https://expressjs.com/)
- [MongoDB — documentación](https://www.mongodb.com/docs/manual/) y [Mongoose](https://mongoosejs.com/docs/)
- [Passport.js](https://www.passportjs.org/docs/), [Jest](https://jestjs.io/docs/) y [Supertest](https://github.com/ladjs/supertest)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [MDN — Content Security Policy](https://developer.mozilla.org/es/docs/Web/HTTP/CSP)
- [Repositorio del proyecto](https://github.com/ivanshifman/TP-BACKEND-SUMAR_IMPACTO)

**Integrantes registrados:** Iván Ezequiel Shifman, Ángel Sabato, Flavio Rinaldi y Marcelo Zárate. El equipo debe
validar la lista y completar las responsabilidades individuales en la documentación final.
