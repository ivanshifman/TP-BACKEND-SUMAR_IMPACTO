import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

const PUERTO = process.env.PORT || 3000;

async function iniciar() {
  await connectDB();
  app.listen(PUERTO, () => {
    console.log(`Servidor de SumarImpacto corriendo en http://localhost:${PUERTO}`);
  });
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
});
