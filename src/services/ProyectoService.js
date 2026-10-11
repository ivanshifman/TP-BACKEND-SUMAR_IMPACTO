import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import Proyecto from "../models/Proyecto.js";
import Organizacion from "../models/Organizacion.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import ApiError from "../utils/ApiError.js";

class ProyectoService {
  validarFormatoId(id, etiqueta = "id") {
    if (!isValidObjectId(id)) {
      throw ApiError.badRequest(`El ${etiqueta} '${id}' no tiene un formato válido.`);
    }
  }

  async obtenerProyectoOFallar(proyectoId) {
    this.validarFormatoId(proyectoId, "id de proyecto");
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      throw ApiError.notFound(`No existe un proyecto con id ${proyectoId}.`);
    }
    return proyecto;
  }

  async validarOrganizacionExiste(organizacionId) {
    this.validarFormatoId(organizacionId, "id de organización");
    const organizacion = await Organizacion.findById(organizacionId);
    if (!organizacion) {
      throw ApiError.badRequest(`No existe una organización con id ${organizacionId}.`);
    }
    return organizacion;
  }

  async totalDonado(proyectoId) {
    const resultado = await Donacion.aggregate([
      { $match: { proyecto: new mongoose.Types.ObjectId(proyectoId) } },
      { $group: { _id: null, total: { $sum: "$monto" } } },
    ]);
    return resultado.length ? resultado[0].total : 0;
  }

  async totalGastado(proyectoId) {
    const resultado = await Gasto.aggregate([
      { $match: { proyecto: new mongoose.Types.ObjectId(proyectoId) } },
      { $group: { _id: null, total: { $sum: "$monto" } } },
    ]);
    return resultado.length ? resultado[0].total : 0;
  }

  async calcularSaldoDisponible(proyectoId) {
    await this.obtenerProyectoOFallar(proyectoId);
    const [totalDonado, totalGastado] = await Promise.all([
      this.totalDonado(proyectoId),
      this.totalGastado(proyectoId),
    ]);
    return {
      proyectoId: String(proyectoId),
      totalDonado,
      totalGastado,
      saldoDisponible: totalDonado - totalGastado,
    };
  }

  async validarGastoContraSaldo(proyectoId, montoGasto) {
    const { saldoDisponible } = await this.calcularSaldoDisponible(proyectoId);
    if (montoGasto > saldoDisponible) {
      throw ApiError.conflict(
        `El gasto ($${montoGasto}) supera el saldo disponible del proyecto ($${saldoDisponible}).`
      );
    }
  }

  async marcarDonacionesUtilizadas(proyectoId, montoGasto) {
    const donacionesDisponibles = await Donacion.find({
      proyecto: proyectoId,
      utilizada: false,
    }).sort({ fecha: 1 });

    let restante = montoGasto;
    for (const donacion of donacionesDisponibles) {
      if (restante <= 0) break;
      donacion.utilizada = true;
      await donacion.save();
      restante -= donacion.monto;
    }
  }
}

export const proyectoService = new ProyectoService();
export default proyectoService;
