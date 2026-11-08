# Plan y evidencia de pruebas

## Jest

El proyecto usa Jest 30 en modo ESM y Supertest para probar la aplicación HTTP sin abrir un puerto ni
abrir conexiones a servicios externos. La suite combina pruebas unitarias, HTTP e integración con una
instancia temporal y aislada de MongoDB y un servidor SMTP local de prueba.

```bash
npm test
npm run test:watch
npm run test:coverage
```

La cobertura se genera en `coverage/` (HTML disponible en `coverage/lcov-report/index.html`). La suite no
requiere credenciales, `.env`, Atlas ni un SMTP externo. `mongodb-memory-server-core` descarga una versión
de MongoDB para el sistema operativo la primera vez que se ejecuta la integración; el binario se guarda en
la caché del usuario y no se agrega al repositorio.

## Pruebas automatizadas ejecutadas en el entorno de edición

| Control | Resultado |
|---|---|
| `npm run check` (Node `--check` y compilación Pug) | Correcto: 54 archivos JS y 22 plantillas Pug |
| `npm test` (Jest) | 57 pruebas aprobadas: 16 unitarias/HTTP y 41 de integración; 0 fallidas |
| `npm run test:coverage` | 57 pruebas aprobadas; cobertura global: 60,12 % de sentencias, 44,99 % de ramas, 47,89 % de funciones y 63,66 % de líneas |
| `npm audit --omit=dev` | 0 vulnerabilidades informadas en dependencias de producción |

Las pruebas unitarias cubren aprobación automática, tope mensual, derivación a Auditoría, intervención de
Mesa, reglas básicas, importes inválidos y umbrales configurables. Las pruebas HTTP cubren salud, autenticación
requerida, redirección a login y protección de origen. La suite de integración valida persistencia, permisos,
archivos, transiciones de estados, SMTP y reportes contra servicios locales descartables.

## Matriz de integración y resultados

| ID | Caso | Resultado verificado |
|---|---|---|
| AUTH-01–05 | Login correcto/incorrecto, access vencido, rotación/replay, usuario inactivo y logout | Verificados con usuarios persistidos; respuestas y revocación del refresh token comprobadas. |
| AUTHZ-01–03 | Matrices de roles, alcance de referente, lectura administrativa y prohibición de aprobar como administrador | Verificados para los seis roles; aislamiento entre organizaciones comprobado. |
| RF01-01–03 | PDF/JPG/PNG/WEBP con firma, falta de archivo, MIME/contenido incorrecto, archivo mayor a 5 MB, rubro y período inválidos | Firmas admitidas persisten; casos inválidos responden 400 o pasan a Auditoría según regla. |
| RF02-01–06 | Autoaprobación, tope mensual, Auditoría, Mesa, auto-revisión y saldo insuficiente | Estados y actores persistidos; transiciones no autorizadas y saldo excedido rechazados. |
| RF03-01–03 | Aprobación, envío SMTP, fallo/reintentos y frecuencias semanal/mensual | Verificados con SMTP local: mensaje recibido, cuatro intentos totales ante fallos (inicial + tres reintentos), estado final y fechas programadas. |
| RF04-01 | Agregación de campaña y PDF | Total, cantidad, avance, render HTML y cabecera/contenido PDF comprobados. |
| WEB-01 | Acceso sin login a página protegida | Redirección a `/login` verificada. |
| ERR-01–03 | ObjectId inválido, recurso inexistente y dato único duplicado | Respuestas 400, 404 y 409 verificadas con base persistida. |

La integración se ejecuta exclusivamente contra MongoDB en memoria y un servidor SMTP local; no modifica
Atlas ni envía correo externo. Son pruebas automatizadas reproducibles, no una prueba de despliegue. Continúan
pendientes las pruebas en staging/hosting, la medición del objetivo de 1.000 eventos por minuto, la validación
con SMTP real y la grabación de evidencia audiovisual para la defensa.

## Comandos en entorno local

```bash
npm install
npm run check
npm test
npm run create-admin
npm run seed  # solo base descartable de desarrollo
npm run dev
```
