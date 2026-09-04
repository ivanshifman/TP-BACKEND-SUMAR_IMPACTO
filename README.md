# SumarImpacto — Backend (DSWB, Primera Entrega)

Backend de **SumarImpacto**, desarrollado para la Primera Entrega del Trabajo Práctico
Integrador de Desarrollo Web Backend (DSWB), IFTS N° 29 — Comisión A — 2do Cuatrimestre 2026.

El sistema administra donantes, organizaciones, proyectos, donaciones y gastos,
calculando en todo momento el saldo disponible de cada proyecto y protegiendo las
donaciones ya utilizadas frente a modificaciones posteriores.

## Tecnologías utilizadas

- Node.js
- Express
- Pug (motor de plantillas)
- Persistencia en archivos JSON (sin base de datos, según el alcance de esta entrega)

## Instalación y ejecución

```bash
npm install
npm start
```

El servidor levanta en `http://localhost:3000`.

- Interfaz web: `http://localhost:3000/`
- API REST: `http://localhost:3000/api/...`

## Estructura del proyecto

```text
sumarimpacto-backend/
├── server.js
├── data/                  # Persistencia en archivos JSON
├── src/
│   ├── app.js
│   ├── models/            # Clases de entidad con sus propias validaciones (POO)
│   ├── repositories/      # Acceso a los archivos JSON (patrón Repository)
│   ├── services/          # Lógica de negocio (saldo, validaciones cruzadas)
│   ├── controllers/       # Controladores de la API y de las vistas
│   ├── routes/            # Definición de rutas
│   ├── middleware/        # Logger, 404 y manejo centralizado de errores
│   └── utils/             # ApiError, códigos HTTP, asyncHandler
└── views/                 # Vistas Pug (inicio, detalle de proyecto, error)
```

## Endpoints principales

Ver el detalle completo, con ejemplos de solicitud y respuesta, en la documentación
de la entrega (`DSWB_2A_CASO5_2C26.pdf`).

| Recurso | Endpoints |
| --- | --- |
| Donantes | `GET/POST /api/donantes`, `GET/PUT/DELETE /api/donantes/:id` |
| Organizaciones | `GET/POST /api/organizaciones`, `GET/PUT/DELETE /api/organizaciones/:id` |
| Proyectos | `GET/POST /api/proyectos`, `GET/PUT/DELETE /api/proyectos/:id`, `GET /api/proyectos/:id/saldo`, `GET /api/proyectos/:id/donaciones`, `GET /api/proyectos/:id/gastos` |
| Donaciones | `GET/POST /api/donaciones`, `GET/PUT/DELETE /api/donaciones/:id` |
| Gastos | `GET/POST /api/gastos`, `GET /api/gastos/:id` |

## Bibliografía

- Express.js. *Using template engines with Express*. <https://expressjs.com/es/guide/using-template-engines/>
- MDN Web Docs. *Express Tutorial Part 2: Creating a skeleton website*. <https://developer.mozilla.org/es/docs/Learn/Server-side/Express_Nodejs/skeleton_website>
- Pug. *Documentación oficial*. <https://pugjs.org/api/getting-started.html>
- Node.js. *Documentación oficial*. <https://nodejs.org/es/docs>
- VidaMRR. *Tutorial de Pug para hacer plantillas dinámicas | Curso de Node.js + Express.js*. <https://www.youtube.com/watch?v=K7jysT0T8QM>

## Integrantes

Iván Ezequiel Shifman, Ángel Sabato, Flavio Rinaldi, Marcelo Zárate.
