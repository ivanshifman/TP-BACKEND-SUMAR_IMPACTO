const donacionRepository = require("../repositories/DonacionRepository");
const donanteRepository = require("../repositories/DonanteRepository");
const proyectoRepository = require("../repositories/ProyectoRepository");
const ApiError = require("../utils/ApiError");

class DonacionService {
  validarDonanteExiste(donanteId) {
    const donante = donanteRepository.findById(donanteId);
    if (!donante) {
      throw ApiError.badRequest(`No existe un donante con id ${donanteId}.`);
    }
    return donante;
  }

  validarProyectoExisteSiCorresponde(proyectoId) {
    if (proyectoId === null || proyectoId === undefined) return;
    const proyecto = proyectoRepository.findById(proyectoId);
    if (!proyecto) {
      throw ApiError.badRequest(`No existe un proyecto con id ${proyectoId}.`);
    }
  }

  validarNoUtilizadaAntesDeModificar(donacionId) {
    const donacion = donacionRepository.findById(donacionId);
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

module.exports = new DonacionService();
