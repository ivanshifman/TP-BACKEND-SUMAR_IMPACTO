import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Usuario from "../src/models/Usuario.js";
import { ROLES } from "../src/config/security.js";
import { normalizarEmail } from "../src/utils/email.js";
import { evaluarPassword, MENSAJE_POLITICA_PASSWORD } from "../src/utils/politicaPassword.js";

async function main() {
  const { BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAME = "Administrador SumarImpacto" } = process.env;
  if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) throw new Error("Configurá BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD en .env.");
  if (BOOTSTRAP_ADMIN_PASSWORD.startsWith("REEMPLAZAR") || evaluarPassword(BOOTSTRAP_ADMIN_PASSWORD, { email: BOOTSTRAP_ADMIN_EMAIL }).length) {
    throw new Error(MENSAJE_POLITICA_PASSWORD);
  }
  await connectDB();
  const email = normalizarEmail(BOOTSTRAP_ADMIN_EMAIL);
  if (await Usuario.exists({ email })) throw new Error("Ya existe un usuario con ese email.");
  // La contraseña inicial viaja por variable de entorno: se exige cambiarla en el primer ingreso.
  await Usuario.create({ nombre: BOOTSTRAP_ADMIN_NAME, email, password: BOOTSTRAP_ADMIN_PASSWORD, rol: ROLES.ADMIN, debeCambiarPassword: true });
  console.log(`Administrador creado: ${email}. Deberá cambiar la contraseña en su primer ingreso.`);
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { if (mongoose.connection.readyState) await mongoose.connection.close(); });
