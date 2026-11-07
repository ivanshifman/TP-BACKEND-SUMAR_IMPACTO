# Plan y evidencia de pruebas

## Pruebas automatizadas ejecutadas en el entorno de edición

| Control | Resultado |
|---|---|
| `npm run check` (Node `--check` sobre los archivos JS) | Correcto: 54 archivos |
| `node --test tests/*.test.js` | 7 pruebas aprobadas, 0 fallidas |

Las siete pruebas cubren aprobación automática hasta el 5 %, tope mensual de 5 %, derivación a Auditoría, intervención de Mesa por encima del 30 %, incumplimiento de reglas básicas y rechazo de importes inválidos y parametrización de umbrales RF-02.

## Pruebas de integración que deben ejecutarse con dependencias y MongoDB

| ID | Caso | Resultado esperado |
|---|---|---|
| AUTH-01 | Login con contraseña correcta | Access y refresh token emitidos |
| AUTH-02 | Login con contraseña incorrecta | 401 genérico; no revela si el email existe |
| AUTH-03 | Access token vencido | 401; refresh rota tokens |
| AUTH-04 | Refresh token reutilizado luego de rotación | 401 |
| AUTH-05 | Usuario inactivo | 401 en endpoints protegidos |
| AUTHZ-01 | Referente intenta consultar proyecto de otra organización | 403 |
| AUTHZ-02 | Administración intenta aprobar una rendición | 403 |
| AUTHZ-03 | Administración consulta rendiciones | Lectura permitida, sin acciones de aprobación |
| RF01-01 | Carga con JPG/PNG/WEBP/PDF válido menor a 5 MB | Rendición registrada |
| RF01-02 | Falta archivo, MIME falso o archivo mayor a 5 MB | 400 |
| RF01-03 | Rubro no presupuestado o fecha fuera del período | Pasa a Auditoría; no se autoaprueba |
| RF02-01 | Hasta 5 %, reglas correctas y tope mensual respetado | Aprobación automática |
| RF02-02 | Acumulado automático mensual supera 5 % | Pasa a Auditoría |
| RF02-03 | Más de 5 % y hasta 30 % | Auditoría resuelve |
| RF02-04 | Más de 30 % | Auditoría revisa y Mesa resuelve |
| RF02-05 | Usuario intenta resolver su propia rendición | 403 |
| RF02-06 | Gasto superior al saldo | 409 |
| RF03-01 | Rendición aprobada y SMTP configurado | Evento en cola y email enviado |
| RF03-02 | SMTP falla | Hasta tres reintentos cada cinco minutos; luego fallida |
| RF03-03 | Preferencia semanal/mensual | Agrupación de eventos por destinatario |
| RF04-01 | Donaciones asociadas a campaña | Total, cantidad y avance de meta correctos |
| WEB-01 | Acceso sin login a páginas protegidas | Redirección a `/login` |
| ERR-01 | ObjectId mal formado | 400 uniforme |
| ERR-02 | Recurso inexistente | 404 uniforme |
| ERR-03 | Email duplicado | 409 uniforme |

## Qué no se pudo verificar en este entorno

No se pudo instalar dependencias desde npm porque el registro no respondió dentro del tiempo disponible. Tampoco se configuró una base MongoDB Atlas, SMTP, frontend ni hosting. Por eso no se afirma que los casos de integración, el render Pug con dependencias reales, la entrega de email o el despliegue estén aprobados. Ejecutá la matriz en staging y agregá capturas/logs reales al PDF final.

## Comandos en entorno local

```bash
npm install
npm run check
npm test
npm run create-admin
npm run seed  # solo base descartable de desarrollo
npm run dev
```
