const proyectoRepository = require("../repositories/ProyectoRepository");
const donacionRepository = require("../repositories/DonacionRepository");
const gastoRepository = require("../repositories/GastoRepository");
const organizacionRepository = require("../repositories/OrganizacionRepository");
const ApiError = require("../utils/ApiError");

class ProyectoService {
  obtenerProyectoOFallar(proyectoId) {
    const proyecto = proyectoRepository.findById(proyectoId);
    if (!proyecto) {
      throw ApiError.notFound(`No existe un proyecto con id ${proyectoId}.`);
    }
    return proyecto;
  }

  validarOrganizacionExiste(organizacionId) {
    const organizacion = organizacionRepository.findById(organizacionId);
    if (!organizacion) {
      throw ApiError.badRequest(`No existe una organización con id ${organizacionId}.`);
    }
    return organizacion;
  }

  totalDonado(proyectoId) {
    return donacionRepository
      .findByProyecto(proyectoId)
      .reduce((acumulado, donacion) => acumulado + donacion.monto, 0);
  }

  totalGastado(proyectoId) {
    return gastoRepository
      .findByProyecto(proyectoId)
      .reduce((acumulado, gasto) => acumulado + gasto.monto, 0);
  }

  calcularSaldoDisponible(proyectoId) {
    this.obtenerProyectoOFallar(proyectoId);
    const totalDonado = this.totalDonado(proyectoId);
    const totalGastado = this.totalGastado(proyectoId);
    return {
      proyectoId: Number(proyectoId),
      totalDonado,
      totalGastado,
      saldoDisponible: totalDonado - totalGastado,
    };
  }

  validarGastoContraSaldo(proyectoId, montoGasto) {
    const { saldoDisponible } = this.calcularSaldoDisponible(proyectoId);
    if (montoGasto > saldoDisponible) {
      throw ApiError.conflict(
        `El gasto ($${montoGasto}) supera el saldo disponible del proyecto ($${saldoDisponible}).`
      );
    }
  }

  marcarDonacionesUtilizadas(proyectoId, montoGasto) {
    const donacionesDisponibles = donacionRepository
      .findByProyecto(proyectoId)
      .filter((d) => !d.utilizada)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let restante = montoGasto;
    for (const donacion of donacionesDisponibles) {
      if (restante <= 0) break;
      donacionRepository.update(donacion.id, { utilizada: true });
      restante -= donacion.monto;
    }
  }
}

module.exports = new ProyectoService();
