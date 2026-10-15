# SumarImpacto — Backend (DSWB, Segunda Entrega)

Backend de **SumarImpacto**, desarrollado para la Segunda Entrega del Trabajo Práctico
Integrador de Desarrollo Web Backend (DSWB), IFTS N° 29 — Comisión A — 2do Cuatrimestre 2026.

Respecto de la Primera Entrega, esta versión migra la persistencia de archivos JSON a
**MongoDB con Mongoose**, convierte todo el código a **ES Modules** (`import`/`export`)
y suma **formularios** en las vistas Pug para crear, editar y eliminar datos desde el
navegador, además de la API REST.

## Tecnologías utilizadas

- Node.js (ES Modules)
- Express
- MongoDB + Mongoose
- Pug (motor de plantillas)
- method-override (para que los `<form>` HTML puedan enviar PUT/DELETE)
- dotenv (variables de entorno)

## Instalación y ejecución

```bash
npm install
cp .env.example .env
npm run seed             
npm start
```

El servidor levanta en `http://localhost:3000`.

- Interfaz web (con formularios): `http://localhost:3000/`
- API REST: `http://localhost:3000/api/...`

## Variables de entorno

Ver `.env.example`. La única obligatoria es `MONGODB_URI` (cadena de conexión a
MongoDB, local o Atlas). `PORT` es opcional (por defecto 3000).

## Estructura del proyecto

```text
sumarimpacto-backend/
├── server.js
├── .env.example
├── data/
│   └── seed.js             # script de carga de datos de ejemplo (npm run seed)
├── src/
│   ├── app.js
│   ├── config/
│   │   └── db.js            # conexión a MongoDB con Mongoose
│   ├── models/               # esquemas de Mongoose (con validaciones propias)
│   ├── services/              # lógica de negocio (saldo, validaciones cruzadas)
│   ├── controllers/           # controladores de la API y de las vistas
│   ├── routes/                 # definición de rutas (API + vistas)
│   ├── middleware/             # logger, 404, manejo centralizado de errores
│   └── utils/                   # ApiError, códigos HTTP, asyncHandler
└── views/                        # vistas Pug: listados, detalles y formularios
```

## Relaciones entre entidades

Las relaciones usan el `ObjectId` nativo de MongoDB (vía Mongoose `ref`), en vez de
los IDs numéricos propios que se usaban con persistencia en JSON:

- `Proyecto.organizacion` → referencia a `Organizacion`
- `Donacion.donante` → referencia a `Donante`
- `Donacion.proyecto` → referencia a `Proyecto` (opcional)
- `Gasto.proyecto` → referencia a `Proyecto`

## Validaciones

Se resuelven en dos niveles:

- **Formato**: a nivel de esquema de Mongoose (`required`, `min`, `enum`, `match`,
  `minlength`), sin middleware de validación general, siguiendo la indicación
  puntual del caso.
- **Negocio**: en los servicios (`ProyectoService`, `DonacionService`), que validan
  relaciones entre colecciones (existencia de donante, proyecto, organización) y
  reglas específicas del caso (saldo disponible, donación no modificable si ya
  fue utilizada).

Los errores propios de Mongoose (`CastError` por un id con formato inválido,
`ValidationError` por una validación de esquema) se traducen automáticamente al
mismo formato de error que usa el resto de la aplicación, en `errorHandler.js`.

## Vistas web disponibles

| Ruta | Descripción |
| --- | --- |
| `GET /` | Listado de proyectos con su saldo disponible |
| `GET /proyectos/nuevo` · `GET /proyectos/:id/editar` | Alta y edición de proyectos |
| `GET /proyectos/:id` | Detalle de un proyecto: donaciones, gastos, acciones |
| `GET /donantes` | Listado de donantes, con alta (`/donantes/nuevo`) y edición |
| `GET /donantes/:id` | Detalle de un donante: historial de donaciones |
| `GET /organizaciones` | Listado de organizaciones, con alta y edición |
| `GET /organizaciones/:id` | Detalle de una organización: sus proyectos |
| `GET /donaciones/nueva` · `GET /donaciones/:id/editar` | Alta y edición de donaciones (bloqueada si ya fue utilizada) |
| `GET /gastos` | Listado global de gastos, con alta (`/gastos/nuevo`) |

Los gastos solo admiten alta por diseño: no se editan ni eliminan, para no romper
la consistencia del saldo ya calculado (ver `11. Decisiones de diseño` en la
documentación de la Primera Entrega).

## Endpoints de la API

Igual que en la Primera Entrega (ver documentación completa en
`DSWB_2A_CASO5_2C26.pdf`), ahora con los mismos recursos sobre MongoDB:

| Recurso | Endpoints |
| --- | --- |
| Donantes | `GET/POST /api/donantes`, `GET/PUT/DELETE /api/donantes/:id` |
| Organizaciones | `GET/POST /api/organizaciones`, `GET/PUT/DELETE /api/organizaciones/:id` |
| Proyectos | `GET/POST /api/proyectos`, `GET/PUT/DELETE /api/proyectos/:id`, `GET /api/proyectos/:id/saldo`, `GET /api/proyectos/:id/donaciones`, `GET /api/proyectos/:id/gastos` |
| Donaciones | `GET/POST /api/donaciones`, `GET/PUT/DELETE /api/donaciones/:id` |
| Gastos | `GET/POST /api/gastos`, `GET /api/gastos/:id` |

## Bibliografía

- Mongoose. *Documentación oficial*. <https://mongoosejs.com/docs/guide.html>
- MongoDB. *Documentación oficial*. <https://www.mongodb.com/docs/manual/>
- Express.js. *Using template engines with Express*. <https://expressjs.com/es/guide/using-template-engines/>
- Pug. *Documentación oficial*. <https://pugjs.org/api/getting-started.html>
- Node.js. *ECMAScript Modules*. <https://nodejs.org/api/esm.html>

## Integrantes

Iván Ezequiel Shifman, Ángel Sabato, Flavio Rinaldi, Marcelo Zárate.
