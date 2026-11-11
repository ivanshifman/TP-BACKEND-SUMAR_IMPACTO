// Imprime la matriz de permisos vigente. Para actualizar la referencia de las pruebas:
//   npm run permisos > tests/fixtures/matriz-permisos.txt
import app from "../src/app.js";
import { generarMatriz } from "../tests/helpers/matrizPermisos.js";

process.stdout.write(generarMatriz(app));
process.exit(0);
