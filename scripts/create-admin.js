import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Usuario from "../src/models/Usuario.js";

async function main() {
  const { BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_NAME = "Administrador SumarImpacto" } = process.env;
  if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) throw new Error("Configurá BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD en .env.");
  if (BOOTSTRAP_ADMIN_PASSWORD.startsWith("REEMPLAZAR") || BOOTSTRAP_ADMIN_PASSWORD.length < 12 || !/[A-Z]/.test(BOOTSTRAP_ADMIN_PASSWORD) || !/[a-z]/.test(BOOTSTRAP_ADMIN_PASSWORD) || !/[0-9]/.test(BOOTSTRAP_ADMIN_PASSWORD) || !/[^A-Za-z0-9]/.test(BOOTSTRAP_ADMIN_PASSWORD)) throw new Error("La contraseña debe tener 12 caracteres e incluir mayúscula, minúscula, número y símbolo.");
  await connectDB();
  const email = BOOTSTRAP_ADMIN_EMAIL.toLowerCase().trim();
  if (await Usuario.exists({ email })) throw new Error("Ya existe un usuario con ese email.");
  await Usuario.create({ nombre: BOOTSTRAP_ADMIN_NAME, email, password: BOOTSTRAP_ADMIN_PASSWORD, rol: "administrador" });
  console.log(`Administrador creado: ${email}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { if (mongoose.connection.readyState) await mongoose.connection.close(); });
