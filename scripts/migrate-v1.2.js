import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";

/**
 * Migración de la versión 1.1 a la 1.2. Es idempotente: puede ejecutarse más de una vez.
 *
 *  - Elimina el campo `utilizada` de las donaciones (nunca se activaba).
 *  - Elimina `frecuenciaNotificacion` de los donantes (se retiraron las notificaciones por correo).
 *  - Elimina la colección `notificacions` del módulo de correo, si existe.
 *
 * No modifica contraseñas, roles ni montos. Hacé un respaldo antes de ejecutarla.
 */
async function main() {
  await connectDB();
  const db = mongoose.connection;

  const donaciones = await db.collection("donacions").updateMany({ utilizada: { $exists: true } }, { $unset: { utilizada: "" } });
  const donantes = await db.collection("donantes").updateMany({ frecuenciaNotificacion: { $exists: true } }, { $unset: { frecuenciaNotificacion: "" } });

  const colecciones = await db.db.listCollections({ name: "notificacions" }).toArray();
  if (colecciones.length) await db.collection("notificacions").drop();

  console.log(`Donaciones actualizadas (campo «utilizada» eliminado): ${donaciones.modifiedCount}.`);
  console.log(`Donantes actualizados (campo «frecuenciaNotificacion» eliminado): ${donantes.modifiedCount}.`);
  console.log(`Colección de notificaciones: ${colecciones.length ? "eliminada" : "no existía"}.`);
  console.log("Los usuarios existentes conservan sus contraseñas; las cuentas nuevas deberán cambiarla en su primer ingreso.");
}

main()
  .catch((error) => { console.error("Migración fallida:", error.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.connection.close(); });
