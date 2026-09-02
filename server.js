const app = require("./src/app");

const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, () => {
  console.log(`Servidor de SumarImpacto corriendo en http://localhost:${PUERTO}`);
});
