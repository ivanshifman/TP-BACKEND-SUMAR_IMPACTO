# Migración de 1.0 a 1.1

## Antes de comenzar

1. Hacé un backup de MongoDB Atlas.
2. Desplegá la versión 1.1 en un entorno de staging primero.
3. Configurá secretos JWT nuevos e independientes.
4. No ejecutes `npm run seed` sobre una base con datos reales: el seed borra las colecciones del dominio.

## Migración de contraseñas

En 1.0 el modelo `Usuario` documentaba que la contraseña se guardaba en texto plano porque la autenticación estaba fuera de alcance. En 1.1 Passport compara hashes bcrypt. Ejecutá:

```bash
npm run migrate-v1.1
```

El script recorre `usuarios`, convierte contraseñas que no tengan prefijo bcrypt, activa cuentas que no tenían `activo` y revoca refresh tokens. No muestra ni exporta contraseñas. Si las contraseñas ya son bcrypt, no las vuelve a procesar.

## Datos que requieren decisión humana

El modelo anterior de `Proyecto` solo tenía `montoObjetivo` opcional. RF-01/RF-02 necesita `presupuestoTotal`, `periodoInicio`, `periodoFin` y `rubros`. El script informa cuántos proyectos están incompletos; **no inventa importes, fechas ni rubros**. Completalos desde el formulario de edición o una migración validada por el equipo.

Los `Gasto` históricos no tienen archivo digital, rubro, actor ni estado de revisión. Se conservan como registros históricos; se muestran sin enlace al archivo y no se consideran rendiciones nuevas. No se les asigna aprobación ficticia.

Los usuarios con rol `referente_territorial` deben tener `organizacion` asignada desde Administración. No se puede inferir la organización de una cuenta antigua.

## Índices

Mongoose crea los índices declarados al inicializar los modelos según la configuración de la base. En producción, planificá la creación de índices únicos (por ejemplo email de donante y usuario) para evitar bloqueos inesperados por datos duplicados. Antes de desplegar, revisá duplicados preexistentes.

## Verificación posterior

- Probar login de una cuenta migrada.
- Confirmar que no se puede autenticar un usuario inactivo.
- Confirmar que los proyectos tienen presupuesto y período completos.
- Confirmar asociación de cada referente con su organización.
- Confirmar que los gastos antiguos se muestran como históricos.
- Crear una rendición de prueba con un comprobante real y revisar los estados RF-02.

---

# Migración de 1.1 a 1.2

## Antes de comenzar

1. Hacé un backup de MongoDB.
2. Ejecutá `npm install` (o `npm ci`): se retiraron las dependencias `nodemailer` y `smtp-server`.
3. Eliminá del `.env` las variables que ya no se usan: `SMTP_*`, `APP_BASE_URL` y `COMPROBANTE_LINK_SECRET`.
   Si la clave SMTP era real, **revocala** en el proveedor.

## Datos

```bash
npm run migrate-v1.2
```

El script es idempotente y elimina lo que dejó de existir:

- el campo `utilizada` de las donaciones (nunca se activaba);
- el campo `frecuenciaNotificacion` de los donantes;
- la colección `notificacions` del módulo de correo, si existe.

No modifica contraseñas, roles, montos ni fechas. Si no lo ejecutás, la aplicación funciona igual: Mongoose
ignora los campos que ya no están en el esquema.

## Cambios que conviene conocer

- **Cuentas nuevas y restablecidas:** quedan con cambio de contraseña pendiente. Las cuentas **existentes** no
  se ven afectadas y conservan su contraseña.
- **Emails:** desde esta versión se guardan en minúsculas **sin alterar los puntos** de las cuentas Gmail. Las
  cuentas Gmail con puntos creadas con una versión anterior pudieron haberse guardado sin esos puntos; si alguien
  no puede ingresar con su dirección completa, probá sin los puntos o pedile al administrador que corrija el
  email.
- **Proyectos:** aparece el estado activo/inactivo. Los proyectos existentes quedan activos.
- **Donaciones:** solo se aceptan para proyectos activos y campañas vigentes que abarquen la fecha.
- **Reporte de campaña:** ahora incluye las donaciones hechas el último día de la campaña; las cifras de
  campañas ya finalizadas pueden aumentar respecto de lo informado antes.
- **Bitácora:** se crea la colección `auditorias` al primer uso; no requiere migración.
- **CORS:** `CORS_ORIGINS` ya no debe incluir el dominio de la propia aplicación.

## Verificación posterior

- Ingresar con una cuenta existente y comprobar que no se le exige cambiar la contraseña.
- Crear un usuario de prueba y comprobar que debe cambiar la contraseña al ingresar.
- Desactivar y reactivar un proyecto de prueba.
- Consultar `/admin/auditoria` y comprobar que aparecen las acciones recientes.
- Comprobar que el menú de cada rol muestra solo lo que puede usar.
