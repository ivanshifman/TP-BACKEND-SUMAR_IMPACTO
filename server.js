import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import notificacionService from "./src/services/NotificacionService.js";

const PORT = Number(process.env.PORT) || 3000;
const REQUIRED_SECRETS = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
async function iniciar() {
  const missing = REQUIRED_SECRETS.filter((key) => !process.env[key] || process.env[key].length < 32 || process.env[key].startsWith("REEMPLAZAR"));
  if (missing.length) throw new Error(`Configurá secretos de al menos 32 caracteres: ${missing.join(", ")}. Revisá .env.example.`);
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error("JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos.");
  if (process.env.COMPROBANTE_LINK_SECRET && (process.env.COMPROBANTE_LINK_SECRET.length < 32 || [process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET].includes(process.env.COMPROBANTE_LINK_SECRET))) throw new Error("COMPROBANTE_LINK_SECRET debe tener 32 caracteres y ser distinto de los secretos JWT.");
  await connectDB();
  const notificationTimer = notificacionService.iniciarWorker();
  const server = app.listen(PORT, () => console.log(`SumarImpacto disponible en http://localhost:${PORT}`));
  const shutdown = (signal) => { console.log(`${signal}: cerrando servidor...`); if (notificationTimer) clearInterval(notificationTimer); server.close(async () => { const mongoose = await import("mongoose"); await mongoose.default.connection.close(); process.exit(0); }); };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
iniciar().catch((error) => { console.error("No se pudo iniciar SumarImpacto:", error.message); process.exit(1); });
