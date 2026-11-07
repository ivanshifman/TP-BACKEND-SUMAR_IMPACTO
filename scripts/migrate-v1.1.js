import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../src/config/db.js";

async function main() {
  await connectDB();
  const users = mongoose.connection.collection("usuarios");
  const cursor = users.find({ password: { $type: "string" } });
  let migrated = 0;
  for await (const user of cursor) {
    if (/^\$2[aby]\$/.test(user.password)) continue;
    const password = await bcrypt.hash(user.password, 12);
    await users.updateOne({ _id: user._id }, { $set: { password, activo: user.activo ?? true, refreshTokenHash: null }, $unset: { __v: "" } });
    migrated += 1;
  }
  const projectsPending = await mongoose.connection.collection("proyectos").countDocuments({ $or: [{ presupuestoTotal: { $exists: false } }, { periodoInicio: { $exists: false } }, { periodoFin: { $exists: false } }, { rubros: { $exists: false } }] });
  const legacyExpenses = await mongoose.connection.collection("gastos").countDocuments({ comprobante: { $exists: false } });
  console.log(`Contraseñas antiguas convertidas a bcrypt: ${migrated}.`);
  console.log(`Proyectos que requieren completar presupuesto, período y rubros: ${projectsPending}.`);
  console.log(`Gastos históricos sin comprobante digital: ${legacyExpenses}. Se conservan como registros históricos; no se inventan archivos ni estados.`);
  console.log("La asignación de organización a cada referente debe completarse manualmente desde Administración.");
}
main().catch((error) => { console.error("Migración fallida:", error.message); process.exitCode = 1; }).finally(async () => { if (mongoose.connection.readyState) await mongoose.connection.close(); });
