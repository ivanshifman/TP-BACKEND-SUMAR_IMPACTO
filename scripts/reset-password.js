import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Usuario from "../src/models/Usuario.js";
import { normalizarEmail } from "../src/utils/email.js";
import { evaluarPassword, MENSAJE_POLITICA_PASSWORD } from "../src/utils/politicaPassword.js";

/**
 * Recuperación de acceso desde la consola del servidor, para el caso en que el único administrador
 * olvide su contraseña (el sistema no envía correos de recuperación).
 *
 *   RESET_EMAIL=admin@sumarimpacto.local RESET_PASSWORD='Clave-Temporal-2026!' npm run reset-password
 *
 * La contraseña se recibe por variable de entorno para no quedar en el historial de comandos.
 * La cuenta queda con cambio de contraseña obligatorio y con todas sus sesiones cerradas.
 */
async function main() {
  const { RESET_EMAIL, RESET_PASSWORD } = process.env;
  if (!RESET_EMAIL || !RESET_PASSWORD) throw new Error("Indicá RESET_EMAIL y RESET_PASSWORD como variables de entorno.");
  if (evaluarPassword(RESET_PASSWORD, { email: RESET_EMAIL }).length) throw new Error(MENSAJE_POLITICA_PASSWORD);

  await connectDB();
  const usuario = await Usuario.findOne({ email: normalizarEmail(RESET_EMAIL) }).select("+password +refreshTokenHash");
  if (!usuario) throw new Error("No existe un usuario con ese email.");

  usuario.password = RESET_PASSWORD;
  usuario.activo = true;
  usuario.debeCambiarPassword = true;
  usuario.refreshTokenHash = null;
  await usuario.save();
  console.log(`Contraseña restablecida para ${usuario.email}. Deberá cambiarla en su próximo ingreso.`);
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.connection.close(); });
