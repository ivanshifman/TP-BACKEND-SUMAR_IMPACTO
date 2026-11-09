# Red SumarImpacto — Informe técnico actualizado

**Versión:** 1.1  
**Materia:** Desarrollo Web Backend — IFTS N.º 29  
**Comisión:** A · **Grupo:** 6  
**Estado de esta revisión:** 8 de noviembre de 2026

> Este informe refleja el estado comprobado del repositorio y del entorno local a la fecha indicada. No presenta como realizados un despliegue público, pruebas de integración pendientes, el video grupal ni tareas individuales que el equipo no haya confirmado. Debe ser revisado por todos los integrantes antes de la entrega.

## 1. Objetivo y alcance

SumarImpacto permite registrar donaciones a organizaciones sociales, asociarlas a proyectos y rendir los gastos con comprobantes. La versión 1.1 conserva Node.js, Express, MongoDB/Mongoose y vistas Pug, e incorpora autenticación, permisos por rol, rendiciones digitales, campañas, reportes y notificaciones.

### Funcionalidades implementadas

- Autenticación con Passport Local y JWT; contraseñas protegidas con bcrypt.
- Seis roles con permisos distintos y alcance por organización para Referentes Territoriales.
- Carga de comprobantes JPG, PNG, WEBP o PDF, con límite de 5 MB y validación de tipo y firma binaria.
- Circuito de rendición RF-02, reglas de presupuesto y revisión por Auditoría y Mesa Coordinadora.
- Campañas con metas, reportes de recaudación y exportación PDF.
- Cola persistente de notificaciones a donantes y envío SMTP con reintentos.
- Interfaz web Pug y API REST sobre la misma lógica de negocio.

## 2. Arquitectura y tecnologías

El backend usa MVC con una capa de servicios:

- **Rutas:** autenticación, permisos y validación de entrada.
- **Controladores:** coordinan solicitudes HTTP y respuestas JSON o Pug.
- **Servicios:** reglas de negocio, saldo de proyectos, rendiciones y notificaciones.
- **Modelos:** persistencia e invariantes con Mongoose.
- **Middleware:** autorización, manejo de errores, carga de archivos, logging y seguridad HTTP.

| Componente | Tecnología |
|---|---|
| Runtime | Node.js (mínimo soportado: 20; verificación local realizada con 24.17.0) |
| Framework | Express 4.22.3 |
| Persistencia | MongoDB Atlas y Mongoose 9.12.0 |
| Vistas | Pug 3 |
| Autenticación | Passport, JWT y bcryptjs |
| Validación y seguridad | express-validator, Helmet, CORS, express-rate-limit |
| Archivos, correo y reportes | Multer, Nodemailer 10.4.0, PDFKit |
| Pruebas | Jest 30.5.2 y Supertest 7.3.2 |

Las versiones instaladas quedan fijadas en `package-lock.json`; al instalar en otro entorno se debe usar `npm ci`.

## 3. Modelo y roles

El dominio incluye `Usuario`, `Organizacion`, `Proyecto`, `Donante`, `Donacion`, `Campania`, `Gasto` y `Notificacion`. Las relaciones usan `ObjectId` y referencias de Mongoose. Los comprobantes se guardan como `Buffer` en MongoDB.

| Rol | Responsabilidad principal |
|---|---|
| Administrador del sistema | Gestiona usuarios y consulta información; no aprueba rendiciones. |
| Referente territorial | Consulta proyectos de su organización y carga comprobantes. |
| Auditoría | Revisa y resuelve las rendiciones de su tramo. |
| Mesa Coordinadora | Gestiona proyectos/campañas y resuelve rendiciones derivadas de alto monto. |
| Administración | Gestiona donantes y donaciones; consulta rendiciones en modo lectura. |
| Trabajo Social | Gestiona organizaciones y proyectos. |

### Circuito de rendición RF-02

La fecha del comprobante debe estar dentro del período del proyecto, el rubro debe estar aprobado y el gasto no puede superar el saldo disponible. Los umbrales iniciales son 5 % para aprobación automática y tope mensual automático, y más de 30 % para intervención de Mesa después de la revisión de Auditoría. Los valores se configuran mediante variables de entorno y deben confirmarse con Mesa Coordinadora.

## 4. Seguridad y operación

- bcrypt con 12 rondas para contraseñas.
- Access JWT de corta duración y refresh token rotativo; se almacena el hash del refresh token.
- Cookies `HttpOnly`, `SameSite=Strict` y `Secure` en producción; la API también acepta Bearer.
- Autorización en el servidor y aislamiento de proyectos por organización para referentes.
- Helmet, CORS allowlist, protección de origen, rate limiting y respuestas de error uniformes.
- Los comprobantes se validan por MIME y firma binaria y se limitan a 5 MB.

El worker de notificaciones corre dentro del proceso Node mediante un temporizador. Es una implementación de un solo proceso, no una cola de alta disponibilidad. Para mayor escala se recomienda separar worker y cola. Para un volumen elevado, conviene almacenar los comprobantes en almacenamiento de objetos en lugar de MongoDB.

## 5. Instalación y configuración

1. Instalar Node.js 20 o superior y clonar el repositorio.
2. Ejecutar `npm ci`.
3. Copiar `.env.example` a `.env` y configurar `MONGODB_URI`, secretos JWT distintos de al menos 32 caracteres y credenciales del administrador inicial.
4. Ejecutar `npm run create-admin` para crear el primer administrador.
5. Iniciar con `npm run dev` o `npm start`.

`npm run seed` borra las colecciones del dominio antes de cargar datos de ejemplo. Debe usarse únicamente con una base descartable de desarrollo, nunca con datos reales.

## 6. Pruebas y estado de verificación

| Verificación ejecutada | Resultado |
|---|---|
| `npm test` con Jest | 3 suites; 57 pruebas aprobadas, 0 fallidas (16 unitarias/HTTP y 41 de integración). |
| `npm run check` | Sintaxis correcta en 54 archivos JavaScript; 22 plantillas Pug compiladas. |
| `npm run test:coverage` | 57 pruebas aprobadas; cobertura global: 60,12 % de sentencias, 44,99 % de ramas, 47,89 % de funciones y 63,66 % de líneas. |
| Smoke test de Nodemailer 10 | Transporte de prueba y `sendMail()` completados correctamente. |
| `npm audit --omit=dev` | 0 vulnerabilidades informadas en dependencias de producción. |
| `npm audit` completo | 20 vulnerabilidades bajas/moderadas informadas, principalmente en dependencias de desarrollo. No se usó `--force` porque proponía cambios disruptivos. |
| Verificación HTTP local | `/`, `/login` y `/health` respondieron HTTP 200; `/health` indicó base conectada. |
| Conexión a MongoDB Atlas | Conexión comprobada desde el entorno local. |

Las pruebas unitarias/HTTP cubren reglas RF-02, estado de salud desconectado, autenticación requerida, redirección de páginas protegidas y rechazo de orígenes no autorizados. Las 41 pruebas de integración usan `mongodb-memory-server-core` para persistencia aislada y un servidor SMTP local: no escriben en Atlas ni envían correos externos. La primera ejecución descarga el binario local de MongoDB a la caché del usuario.

La suite de integración verifica login, refresh/logout, permisos para los seis roles, aislamiento por organización, archivos PDF/JPG/PNG/WEBP y entradas inválidas, transiciones RF-02 y reintentos, notificaciones SMTP locales, reportes y errores persistidos. Los resultados detallados están en [`TESTING.md`](TESTING.md). Siguen pendientes las pruebas de despliegue en hosting, carga/rendimiento de 1.000 eventos por minuto y entrega con un SMTP real.

## 7. Despliegue

No hay un despliegue público configurado o verificado al momento de esta revisión. La aplicación local y su conexión con Atlas sí fueron verificadas; esto no equivale a una URL de producción.

### Recomendación

Para el diseño actual se recomienda un Web Service Node persistente conectado a MongoDB Atlas, por ejemplo Render:

1. Conectar el repositorio y configurar `npm ci` como build y `npm start` como comando de inicio.
2. Usar `/health` como health check y el `PORT` que provea el servicio.
3. Configurar secretos en el panel del hosting, no en Git: `MONGODB_URI`, secretos JWT, `APP_BASE_URL`, `CORS_ORIGINS` y credenciales SMTP si se usarán notificaciones.
4. Limitar el acceso de red de Atlas a los orígenes necesarios y elegir regiones cercanas.
5. Crear el administrador desde el entorno desplegado y probar login, permisos y flujos relevantes.

Las instancias gratuitas pueden suspenderse por inactividad, pausando el worker integrado. Para procesamiento continuo se requiere una instancia siempre activa o separar el worker.

**Vercel admite Express**, pero esta versión no debería desplegarse allí sin adaptar la arquitectura: Vercel ejecuta Express como Function bajo demanda y el worker basado en `setInterval` necesita un proceso persistente. El procesamiento de notificaciones debería pasar a una cola/worker externo o a una ruta protegida programada. El rate limiter en memoria tampoco comparte estado entre instancias y `express.static()` no sirve los estáticos en Vercel; hay que usar `public/` según la integración.

Referencias oficiales: [Express en Vercel](https://vercel.com/docs/frameworks/backend/express), [Vercel Functions](https://vercel.com/docs/functions), [Web Services de Render](https://render.com/docs/web-services) y [limitaciones del plan gratuito de Render](https://render.com/docs/free).

## 8. Pendientes para la entrega académica

- Ejecutar la matriz de integración en una base descartable o staging y guardar evidencia, fecha, entorno y responsable de cada caso.
- Desplegar y comprobar la aplicación públicamente; añadir al documento final la URL HTTPS.
- Confirmar con Mesa Coordinadora los umbrales de rendición.
- Medir el objetivo de rendimiento de 1.000 eventos por minuto en la infraestructura objetivo; no está medido ni demostrado.
- Validar con el equipo las tareas realmente realizadas por cada integrante. No se atribuyen responsabilidades individuales en este informe.
- Incluir las conclusiones personales/equipo solicitadas: aprendizajes, dificultades y resolución, temas de mayor interés y aspectos por reforzar.
- Grabar el video grupal, verificar permisos de visualización e incluir el enlace.
- Preparar el ZIP individual solicitado y organizar la versión anterior y la actual según las indicaciones de la cátedra.

## 9. Uso de herramientas de IA

Se utilizó un asistente de IA como apoyo para revisar el repositorio, actualizar pruebas y documentación y preparar esta revisión del informe. Los integrantes deben verificar las afirmaciones y los resultados, adaptar el texto a su trabajo real y asumir las decisiones y la entrega final.

## 10. Bibliografía y enlaces

- [Node.js — ECMAScript Modules](https://nodejs.org/api/esm.html)
- [Express.js — documentación](https://expressjs.com/)
- [MongoDB — documentación](https://www.mongodb.com/docs/manual/) y [Mongoose](https://mongoosejs.com/docs/)
- [Passport.js](https://www.passportjs.org/docs/), [Jest](https://jestjs.io/docs/) y [Supertest](https://github.com/ladjs/supertest)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Repositorio del proyecto](https://github.com/ivanshifman/TP-BACKEND-SUMAR_IMPACTO)

**Integrantes registrados:** Iván Ezequiel Shifman, Ángel Sabato, Flavio Rinaldi y Marcelo Zárate. El equipo debe validar la lista y completar las responsabilidades individuales en la documentación final.
