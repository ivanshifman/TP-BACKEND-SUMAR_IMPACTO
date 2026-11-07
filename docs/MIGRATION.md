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
