import { isValidObjectId } from "mongoose";
import Donacion from "../models/Donacion.js";
import Donante from "../models/Donante.js";
import Proyecto from "../models/Proyecto.js";
import Campania from "../models/Campania.js";
import Gasto from "../models/Gasto.js";
import ApiError from "../utils/ApiError.js";
import { LIMITES } from "../config/validacion.js";
import { diaUTC, esFechaFutura } from "../utils/fechas.js";

const vacio = (valor) => valor === null || valor === undefined || valor === "";

class DonacionService {
  validarFormatoId(id, etiqueta = "id") {
    if (!isValidObjectId(id)) {
      throw ApiError.badRequest(`El ${etiqueta} '${id}' no tiene un formato válido.`);
    }
  }

  async validarDonanteExiste(donanteId) {
    this.validarFormatoId(donanteId, "id de donante");
    const donante = await Donante.findById(donanteId);
    if (!donante) {
      throw ApiError.badRequest(`No existe un donante con id ${donanteId}.`);
    }
    return donante;
  }

  async validarProyectoExisteSiCorresponde(proyectoId) {
    if (vacio(proyectoId)) return;
    this.validarFormatoId(proyectoId, "id de proyecto");
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      throw ApiError.badRequest(`No existe un proyecto con id ${proyectoId}.`);
    }
    if (proyecto.activo === false) {
      throw ApiError.conflict("El proyecto está inactivo y no puede recibir donaciones.");
    }
  }

  async validarCampaniaSiCorresponde(campaniaId, fecha) {
    if (vacio(campaniaId)) return;
    this.validarFormatoId(campaniaId, "id de campaña");
    const campania = await Campania.findById(campaniaId);
    if (!campania) throw ApiError.badRequest("La campaña seleccionada no existe.");
    if (!campania.activa) throw ApiError.conflict("La campaña está finalizada y no admite nuevas donaciones.");
    const dia = diaUTC(fecha ?? new Date());
    if (dia < diaUTC(campania.fechaInicio) || dia > diaUTC(campania.fechaFin)) {
      throw ApiError.badRequest("La fecha de la donación está fuera del período de la campaña.");
    }
  }

  validarMontoYFecha({ monto, fecha }) {
    if (!Number.isFinite(Number(monto)) || Number(monto) <= 0 || Number(monto) > LIMITES.MONTO_MAXIMO) {
      throw ApiError.badRequest(`El monto debe ser mayor a cero y no superar ${LIMITES.MONTO_MAXIMO.toLocaleString("es-AR")}.`);
    }
    if (!vacio(fecha)) {
      if (Number.isNaN(new Date(fecha).getTime())) throw ApiError.badRequest("La fecha de la donación no es válida.");
      if (esFechaFutura(fecha)) throw ApiError.badRequest("La fecha de la donación no puede ser futura.");
    }
  }

  async obtenerModificableOFallar(donacionId) {
    this.validarFormatoId(donacionId, "id de donación");
    const donacion = await Donacion.findById(donacionId);
    if (!donacion) {
      throw ApiError.notFound(`No existe una donación con id ${donacionId}.`);
    }
    const hayRendiciones = donacion.proyecto ? await Gasto.exists({ proyecto: donacion.proyecto, estado: { $ne: "observado" } }) : false;
    if (hayRendiciones) {
      throw ApiError.conflict(
        `La donación ${donacionId} está vinculada a movimientos de rendición y no puede modificarse ni eliminarse para preservar la trazabilidad.`
      );
    }
    return donacion;
  }

  async #validarDatos(datos) {
    this.validarMontoYFecha(datos);
    await this.validarDonanteExiste(datos.donante);
    await this.validarProyectoExisteSiCorresponde(datos.proyecto);
    await this.validarCampaniaSiCorresponde(datos.campania, datos.fecha);
  }

  #camposEditables(datos) {
    return {
      donante: datos.donante,
      proyecto: vacio(datos.proyecto) ? null : datos.proyecto,
      campania: vacio(datos.campania) ? null : datos.campania,
      monto: datos.monto,
      fecha: vacio(datos.fecha) ? undefined : datos.fecha,
    };
  }

  async crear(datos) {
    await this.#validarDatos(datos);
    return Donacion.create(this.#camposEditables(datos));
  }

  async actualizar(donacionId, datos) {
    await this.obtenerModificableOFallar(donacionId);
    await this.#validarDatos(datos);
    return Donacion.findByIdAndUpdate(donacionId, this.#camposEditables(datos), { new: true, runValidators: true, context: "query" });
  }

  async eliminar(donacionId) {
    const donacion = await this.obtenerModificableOFallar(donacionId);
    await Donacion.findByIdAndDelete(donacionId);
    return donacion;
  }
}

export const donacionService = new DonacionService();
export default donacionService;
