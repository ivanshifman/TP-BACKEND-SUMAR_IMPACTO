// Genera la matriz de permisos (ruta → roles) recorriendo el router real de Express.
// Sirve para detectar cambios de permisos no intencionales: ver tests/permisos.test.js.

const prefijoDeCapa = (capa) => {
  if (capa.regexp?.fast_slash) return "";
  const coincidencia = capa.regexp.source.match(/^\^\\\/(.*?)\\\/\?\(\?=\\\/\|\$\)$/);
  return coincidencia ? `/${coincidencia[1].replace(/\\\//g, "/")}` : "";
};

export function generarMatriz(app) {
  const filas = [];

  const recorrer = (pila, base, autenticado) => {
    let conAutenticacion = autenticado;
    for (const capa of pila) {
      if (capa.route) {
        const manejadores = capa.route.stack.map((item) => item.handle);
        const roles = manejadores.find((manejador) => Array.isArray(manejador.roles))?.roles ?? null;
        const requiereAuth = conAutenticacion || manejadores.some((manejador) => manejador.name === "autenticar");
        const descripcion = roles ? [...roles].sort().join(",") : "(sin restricción de rol)";
        for (const metodo of Object.keys(capa.route.methods)) {
          filas.push(`${metodo.toUpperCase().padEnd(6)} ${(base + capa.route.path).padEnd(46)} ${requiereAuth ? "AUTH   " : "PUBLICA"}  ${descripcion}`);
        }
      } else if (capa.name === "router") {
        recorrer(capa.handle.stack, base + prefijoDeCapa(capa), conAutenticacion);
      } else if (capa.name === "autenticar") {
        conAutenticacion = true;
      }
    }
  };

  recorrer(app._router.stack, "", false);
  return [...new Set(filas)].sort().join("\n") + "\n";
}
