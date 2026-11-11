import mongoose, { isValidObjectId } from "mongoose";
import Proyecto from "../models/Proyecto.js";
import Organizacion from "../models/Organizacion.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import ApiError from "../utils/ApiError.js";
import { ROLES } from "../config/security.js";
import { validarCambioDePresupuesto } from "../utils/reglasProyecto.js";

const aObjectId = (id) => new mongoose.Types.ObjectId(String(id));
const esReferente = (usuario) => usuario?.rol === ROLES.REFERENTE;

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

  // ── Alcance por organización (referente territorial) ───────────────────────────────────
  validarAcceso(proyecto, usuario) {
    if (esReferente(usuario) && String(proyecto.organizacion) !== String(usuario.organizacion)) {
      throw ApiError.forbidden();
    }
  }

  async idsDeProyectosDeLaOrganizacion(usuario) {
    const proyectos = await Proyecto.find({ organizacion: usuario.organizacion }).select("_id");
    return proyectos.map((proyecto) => proyecto._id);
  }

  // ── Saldos ─────────────────────────────────────────────────────────────────────────────

  /**
   * Calcula donado, gastado aprobado, comprometido y saldo de varios proyectos con tres
   * consultas agrupadas, en lugar de tres por proyecto.
   * @returns {Promise<Map<string, object>>} Resultado por id de proyecto.
   */
  async calcularSaldos(proyectoIds) {
    const ids = proyectoIds.map(aObjectId);
    const agrupar = (Modelo, filtro) => Modelo.aggregate([
      { $match: { proyecto: { $in: ids }, ...filtro } },
      { $group: { _id: "$proyecto", total: { $sum: "$monto" } } },
    ]);
    const [donado, gastado, comprometido] = await Promise.all([
      agrupar(Donacion, {}),
      agrupar(Gasto, { $or: [{ estado: "aprobado" }, { estado: { $exists: false } }] }),
      agrupar(Gasto, { estado: { $ne: "observado" } }),
    ]);
    const totalPorProyecto = (filas) => new Map(filas.map((fila) => [String(fila._id), fila.total]));
    const donadoPor = totalPorProyecto(donado);
    const gastadoPor = totalPorProyecto(gastado);
    const comprometidoPor = totalPorProyecto(comprometido);

    return new Map(ids.map((id) => {
      const clave = String(id);
      const totalDonado = donadoPor.get(clave) ?? 0;
      const totalComprometido = comprometidoPor.get(clave) ?? 0;
      return [clave, {
        proyectoId: clave,
        totalDonado,
        totalGastado: gastadoPor.get(clave) ?? 0,
        totalComprometido,
        saldoDisponible: totalDonado - totalComprometido,
      }];
    }));
  }

  async calcularSaldoDisponible(proyectoId) {
    await this.obtenerProyectoOFallar(proyectoId);
    const saldos = await this.calcularSaldos([proyectoId]);
    return saldos.get(String(proyectoId));
  }

  // ── Altas, modificaciones y bajas ──────────────────────────────────────────────────────

  async crear(datos) {
    await this.validarOrganizacionExiste(datos.organizacion);
    return Proyecto.create(this.#camposEditables(datos));
  }

  async actualizar(proyectoId, datos) {
    const proyecto = await this.obtenerProyectoOFallar(proyectoId);
    await this.validarOrganizacionExiste(datos.organizacion);
    await this.#validarCambioDePresupuesto(proyecto, datos);
    proyecto.set(this.#camposEditables(datos));
    await proyecto.save();
    return proyecto;
  }

  async eliminar(proyectoId) {
    await this.obtenerProyectoOFallar(proyectoId);
    const [donaciones, gastos] = await Promise.all([Donacion.exists({ proyecto: proyectoId }), Gasto.exists({ proyecto: proyectoId })]);
    if (donaciones || gastos) {
      throw ApiError.conflict("No se puede eliminar un proyecto con movimientos asociados. Desactivalo para ocultarlo y conservar su historial.");
    }
    await Proyecto.findByIdAndDelete(proyectoId);
  }

  /** Un proyecto inactivo deja de recibir donaciones y rendiciones, pero conserva su historial. */
  async cambiarActivo(proyectoId, activo) {
    const proyecto = await this.obtenerProyectoOFallar(proyectoId);
    proyecto.activo = Boolean(activo);
    await proyecto.save();
    return proyecto;
  }

  #camposEditables(datos) {
    return {
      nombre: datos.nombre,
      organizacion: datos.organizacion,
      montoObjetivo: datos.montoObjetivo || undefined,
      presupuestoTotal: datos.presupuestoTotal,
      periodoInicio: datos.periodoInicio,
      periodoFin: datos.periodoFin,
      rubros: datos.rubros,
    };
  }

  async #validarCambioDePresupuesto(proyecto, datos) {
    const [comprometidoPorRubro, totalComprometido] = await Promise.all([
      this.#comprometidoPorRubro(proyecto._id),
      this.calcularSaldos([proyecto._id]).then((saldos) => saldos.get(String(proyecto._id)).totalComprometido),
    ]);
    const errores = validarCambioDePresupuesto({
      rubrosActuales: proyecto.rubros,
      rubrosNuevos: datos.rubros ?? [],
      presupuestoActual: proyecto.presupuestoTotal,
      presupuestoNuevo: Number(datos.presupuestoTotal),
      totalComprometido,
      comprometidoPorRubro,
    });
    if (errores.length) throw ApiError.conflict(errores.join(" "));
  }

  async #comprometidoPorRubro(proyectoId) {
    const filas = await Gasto.aggregate([
      { $match: { proyecto: aObjectId(proyectoId), estado: { $ne: "observado" } } },
      { $group: { _id: { $toLower: "$rubro" }, total: { $sum: "$monto" } } },
    ]);
    return new Map(filas.map((fila) => [String(fila._id).trim(), fila.total]));
  }
}

export const proyectoService = new ProyectoService();
export default proyectoService;
