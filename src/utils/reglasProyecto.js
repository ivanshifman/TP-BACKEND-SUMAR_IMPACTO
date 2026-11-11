const clave = (nombre) => String(nombre ?? "").trim().toLowerCase();
const pesos = (valor) => `$${Number(valor).toLocaleString("es-AR")}`;

/**
 * Valida que una modificación del presupuesto no deje inconsistentes las rendiciones ya cargadas.
 * Solo se objeta lo que el cambio efectivamente reduce o elimina: editar el nombre u otros datos
 * de un proyecto nunca queda bloqueado por esta regla.
 *
 * @param {object} p
 * @param {Array<{nombre:string, montoAprobado:number}>} p.rubrosActuales
 * @param {Array<{nombre:string, montoAprobado:number}>} p.rubrosNuevos
 * @param {number} p.presupuestoActual
 * @param {number} p.presupuestoNuevo
 * @param {number} p.totalComprometido  Suma de rendiciones no observadas del proyecto.
 * @param {Map<string, number>} p.comprometidoPorRubro  Rendiciones no observadas por rubro (clave en minúsculas).
 * @returns {string[]} Mensajes de error; vacío si el cambio es válido.
 */
export function validarCambioDePresupuesto({ rubrosActuales = [], rubrosNuevos = [], presupuestoActual, presupuestoNuevo, totalComprometido = 0, comprometidoPorRubro = new Map() }) {
  const errores = [];
  if (Number(presupuestoNuevo) < Number(presupuestoActual) && Number(presupuestoNuevo) < Number(totalComprometido)) {
    errores.push(`El presupuesto total no puede ser menor a lo ya comprometido en rendiciones (${pesos(totalComprometido)}).`);
  }

  const nuevosPorNombre = new Map(rubrosNuevos.map((rubro) => [clave(rubro.nombre), Number(rubro.montoAprobado)]));
  for (const actual of rubrosActuales) {
    const rendido = comprometidoPorRubro.get(clave(actual.nombre)) ?? 0;
    if (rendido <= 0) continue;
    if (!nuevosPorNombre.has(clave(actual.nombre))) {
      errores.push(`No se puede quitar el rubro «${actual.nombre}»: tiene rendiciones por ${pesos(rendido)}.`);
    } else {
      const nuevoMonto = nuevosPorNombre.get(clave(actual.nombre));
      if (nuevoMonto < Number(actual.montoAprobado) && nuevoMonto < rendido) {
        errores.push(`El rubro «${actual.nombre}» no puede quedar por debajo de lo ya rendido (${pesos(rendido)}).`);
      }
    }
  }
  return errores;
}
