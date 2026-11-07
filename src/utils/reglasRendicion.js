/**
 * RF-02: decide el circuito de revisión según el porcentaje del presupuesto.
 * `acumuladoAutomaticoMes` incluye las aprobaciones automáticas ya registradas.
 */
export function decidirCircuitoRendicion({ monto, presupuesto, reglasBasicasCumplidas, acumuladoAutomaticoMes = 0, umbralAutoPct = 5, umbralMesaPct = 30, topeMensualAutoPct = 5 }) {
  const porcentaje = (Number(monto) / Number(presupuesto)) * 100;
  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || Number(presupuesto) <= 0) {
    throw new TypeError("El monto y el presupuesto deben ser números mayores a cero.");
  }
  if (porcentaje <= umbralAutoPct && reglasBasicasCumplidas && acumuladoAutomaticoMes + Number(monto) <= Number(presupuesto) * (topeMensualAutoPct / 100)) {
    return { porcentaje, estado: "aprobado", requiereMesa: false, aprobadoAutomaticamente: true, observacion: null };
  }
  let observacion = null;
  if (porcentaje <= umbralAutoPct && reglasBasicasCumplidas && acumuladoAutomaticoMes + Number(monto) > Number(presupuesto) * (topeMensualAutoPct / 100)) {
    observacion = `El acumulado mensual de aprobaciones automáticas superaría el ${topeMensualAutoPct} % del presupuesto; requiere Auditoría.`;
  }
  return { porcentaje, estado: "en_revision", requiereMesa: porcentaje > umbralMesaPct, aprobadoAutomaticamente: false, observacion };
}
