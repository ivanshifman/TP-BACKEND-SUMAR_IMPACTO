import Donacion from "../models/Donacion.js";
import { diaUTC } from "../utils/fechas.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function periodoDelReporte(campania, ahora = new Date()) {
  const haceUnAnio = new Date(ahora);
  haceUnAnio.setUTCFullYear(haceUnAnio.getUTCFullYear() - 1);
  const desde = campania.fechaInicio > haceUnAnio ? campania.fechaInicio : haceUnAnio;
  const finDeCampania = new Date(diaUTC(campania.fechaFin) + UN_DIA_MS - 1);
  const hasta = finDeCampania < ahora ? finDeCampania : ahora;
  return { desde, hasta };
}

class CampaniaService {
  async resumen(campania) {
    const { desde, hasta } = periodoDelReporte(campania);
    const [resultado] = await Donacion.aggregate([
      { $match: { campania: campania._id, fecha: { $gte: desde, $lte: hasta } } },
      { $group: { _id: null, totalRecaudado: { $sum: "$monto" }, cantidadDonaciones: { $sum: 1 } } },
    ]);
    const total = resultado?.totalRecaudado ?? 0;
    return {
      desde,
      hasta,
      total,
      cantidad: resultado?.cantidadDonaciones ?? 0,
      porcentaje: campania.meta > 0 ? Math.min(100, (total / campania.meta) * 100) : 0,
      cumplimiento: campania.meta > 0 ? (total / campania.meta) * 100 : 0,
    };
  }
}

export const campaniaService = new CampaniaService();
export default campaniaService;
