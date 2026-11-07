# Guía para completar la documentación y defensa de DSWB

La consigna pide un PDF completo con introducción, objetivos, especificación funcional, pruebas, roles, conclusión, enlaces al repositorio, video y desarrollo en línea cuando exista. También pide explicar contenidos teóricos no utilizados, documentar uso de IA y conservar la versión anterior y la actual por separado.

## Cambios técnicos que deben explicarse

- Passport Local + Passport JWT y por qué se eligió autenticación stateless para la API.
- bcrypt para proteger contraseñas; refresh token rotativo y hash almacenado.
- Middleware de autenticación, autorización por rol y aislamiento por organización.
- Validación de entrada con express-validator y validaciones persistentes de Mongoose.
- Manejo centralizado de errores para API y vistas.
- Helmet, CORS allowlist, rate limiting, cookies seguras y validación binaria de archivos.
- Carga de comprobantes y circuito RF-02 y umbrales configurables sujetos a confirmación de Mesa Coordinadora.
- Reportes de campañas y cola de notificaciones.
- Migración de datos desde la versión anterior.

## Trazabilidad de Ingeniería de Software

| Requerimiento | Implementación de backend 1.1 | Evidencia sugerida |
|---|---|---|
| RF-01 | Formulario y API multipart, comprobante, período y rubro | Captura de alta y detalle |
| RF-02 | Roles, aislamiento, umbrales, tope mensual, no autoaprobación | Pruebas por rol y estados |
| RF-03 | Outbox MongoDB, preferencias, worker SMTP, reintentos | Email real y registro de cola |
| RF-04 | Campañas, metas y reporte agregado | Reporte con datos de prueba |
| RF-05 | Guía Pug de tareas por rol | Captura de `/tutorial` |
| RNF-02 | JWT, bcrypt, TLS del despliegue, controles de acceso | Configuración y pruebas negativas |
| RNF-03 | Worker persistente y reintentos | Medición con SMTP de prueba; la capacidad de 1.000 eventos/min debe medirse en infraestructura objetivo |

Los estados visibles, alertas y canal formal de comunicación N4/N5 continúan fuera de los incrementos definidos en Ingeniería de Software. No deben presentarse como implementados.

## Pruebas y defensa

Preparar demostraciones de: login exitoso/fallido; usuario sin permiso; referente intentando otro proyecto; archivo válido e inválido; aprobación automática; envío a Auditoría; derivación a Mesa; rechazo por autoaprobación; saldo insuficiente; campaña y reporte; notificación email; errores 400/401/403/404/409.

La tabla de `docs/TESTING.md` es un plan, no reemplaza resultados reales. Completar estado, fecha, responsable, entorno y evidencia de cada caso antes de entregar.

## Roles del equipo

La documentación puede conservar la asignación individual de Ingeniería de Software (Shifman: carga y usabilidad; Bravo: acceso y seguridad; Rinaldi: transparencia a donantes; Sabato: reportes; Zárate: adopción/rendimiento), pero el grupo debe confirmar quién implementó y verificó cada módulo de esta versión. No atribuir trabajo sin validarlo con los integrantes.

## Uso de IA

Declarar con transparencia qué tareas fueron asistidas por ChatGPT (auditoría de código, propuesta/implementación de cambios, documentación y pruebas unitarias) y que el equipo revisó, ejecutó y validó el resultado. Ajustar esta declaración a las herramientas realmente usadas por el grupo. La responsabilidad de las decisiones y de la entrega final corresponde a los integrantes.

## Enlaces pendientes

- Repositorio GitHub: `https://github.com/ivanshifman/TP-BACKEND-SUMAR_IMPACTO`
- URL del despliegue: completar después de publicar y probar.
- Video grupal: completar después de grabar y configurar permisos de visualización.
