import { isValidObjectId } from "mongoose";
import Donacion from "../models/Donacion.js";
import Donante from "../models/Donante.js";
import Proyecto from "../models/Proyecto.js";
import ApiError from "../utils/ApiError.js";

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
    if (proyectoId === null || proyectoId === undefined || proyectoId === "") return;
    this.validarFormatoId(proyectoId, "id de proyecto");
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      throw ApiError.badRequest(`No existe un proyecto con id ${proyectoId}.`);
    }
  }

  async validarNoUtilizadaAntesDeModificar(donacionId) {
    this.validarFormatoId(donacionId, "id de donación");
    const donacion = await Donacion.findById(donacionId);
    if (!donacion) {
      throw ApiError.notFound(`No existe una donación con id ${donacionId}.`);
    }
    if (donacion.utilizada) {
      throw ApiError.conflict(
        `La donación ${donacionId} ya fue utilizada en un gasto y no puede modificarse.`
      );
    }
    return donacion;
  }
}

export const donacionService = new DonacionService();
export default donacionService;
