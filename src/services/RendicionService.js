import Gasto from "../models/Gasto.js";
import proyectoService from "./ProyectoService.js";
import ApiError from "../utils/ApiError.js";
import { decidirCircuitoRendicion } from "../utils/reglasRendicion.js";
import { UMBRAL_AUTO_APROBACION_PCT, UMBRAL_MESA_COORDINADORA_PCT, TOPE_MENSUAL_AUTO_PCT } from "../config/rendicion.js";
import { LIMITES } from "../config/validacion.js";
import { diaUTC, esFechaFutura } from "../utils/fechas.js";
import { conBloqueo } from "../utils/mutex.js";

const dentroDelPeriodo = (fecha, proyecto) => diaUTC(fecha) >= diaUTC(proyecto.periodoInicio) && diaUTC(fecha) <= diaUTC(proyecto.periodoFin);
const rubroAprobado = (rubro, proyecto) => proyecto.rubros.some((item) => item.nombre.toLowerCase() === String(rubro).trim().toLowerCase());
function validarFirmaArchivo(archivo) {
  const b = archivo?.buffer;
  if (!b?.length) throw ApiError.badRequest("El archivo adjunto está vacío o no se pudo leer.");
  const pdf = b.subarray(0, 5).toString() === "%PDF-";
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  const valid = (archivo.mimetype === "application/pdf" && pdf) || (archivo.mimetype === "image/jpeg" && jpg) || (archivo.mimetype === "image/png" && png) || (archivo.mimetype === "image/webp" && webp);
  if (!valid) throw ApiError.badRequest("El contenido del archivo no coincide con su formato declarado.");
}

class RendicionService {
  async registrar({ datos, archivo, usuario }) {
    if (usuario.rol !== "referente_territorial") throw ApiError.forbidden("Solo un referente territorial puede cargar rendiciones.");
    const proyecto = await proyectoService.obtenerProyectoOFallar(datos.proyecto);
    if (proyecto.activo === false) throw ApiError.conflict("No se pueden cargar rendiciones en un proyecto inactivo.");
    if (usuario.rol === "referente_territorial" && String(usuario.organizacion) !== String(proyecto.organizacion)) {
      throw ApiError.forbidden("Solo podés cargar comprobantes de proyectos de tu organización.");
    }
    if (!archivo) throw ApiError.badRequest("Adjuntá el comprobante para registrar la rendición.");
    validarFirmaArchivo(archivo);
    if (!datos.rubro || !String(datos.rubro).trim()) throw ApiError.badRequest("Seleccioná un rubro para la rendición.");
    if (!datos.fecha || Number.isNaN(new Date(datos.fecha).getTime())) throw ApiError.badRequest("La fecha del comprobante no es válida.");
    if (!Number.isFinite(Number(datos.monto)) || Number(datos.monto) <= 0) throw ApiError.badRequest("El monto debe ser un número mayor a cero.");
    if (Number(datos.monto) > LIMITES.MONTO_MAXIMO) throw ApiError.badRequest(`El monto no puede superar ${LIMITES.MONTO_MAXIMO.toLocaleString("es-AR")}.`);
    if (esFechaFutura(datos.fecha)) throw ApiError.badRequest("La fecha del comprobante no puede ser futura.");

    const monto = Math.round(Number(datos.monto) * 100) / 100;
    const fecha = new Date(datos.fecha);
    if (!Number.isFinite(proyecto.presupuestoTotal) || proyecto.presupuestoTotal <= 0 || !proyecto.periodoInicio || !proyecto.periodoFin || proyecto.periodoFin < proyecto.periodoInicio || !Array.isArray(proyecto.rubros) || proyecto.rubros.length === 0) throw ApiError.conflict("El proyecto todavía no tiene un presupuesto, período y rubros aprobados válidos. Completá esos datos antes de registrar rendiciones.");
    const sumaRubros = proyecto.rubros.reduce((total, rubro) => total + Number(rubro.montoAprobado || 0), 0);
    if (sumaRubros > proyecto.presupuestoTotal) throw ApiError.conflict("La suma de los rubros supera el presupuesto total del proyecto.");
    if (!datos.descripcion || String(datos.descripcion).trim().length < 3 || String(datos.descripcion).length > 500) throw ApiError.badRequest("La descripción debe tener entre 3 y 500 caracteres.");
    // El saldo se verifica y el gasto se crea dentro del mismo bloqueo por proyecto: dos cargas
    // simultáneas no pueden calcular el saldo sobre el mismo estado y superarlo.
    return conBloqueo(String(proyecto._id), () => this.#crearConSaldoVerificado({ proyecto, datos, monto, fecha, archivo, usuario }));
  }

  async #crearConSaldoVerificado({ proyecto, datos, monto, fecha, archivo, usuario }) {
    const saldo = await proyectoService.calcularSaldoDisponible(proyecto._id);
    if (monto > saldo.saldoDisponible) throw ApiError.conflict(`El gasto supera el saldo disponible ($${saldo.saldoDisponible.toFixed(2)}).`);

    const fechaValida = dentroDelPeriodo(fecha, proyecto);
    const rubroValido = String(datos.rubro).trim().toLowerCase() !== "otro" && rubroAprobado(datos.rubro, proyecto);
    const reglasBasicasCumplidas = fechaValida && rubroValido && monto <= saldo.saldoDisponible;
    const porcentajePresupuesto = (monto / proyecto.presupuestoTotal) * 100;
    const inicioMes = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
    const finMes = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1));
    const acumulado = await Gasto.aggregate([
      { $match: { proyecto: proyecto._id, estado: "aprobado", aprobadoAutomaticamente: true, fecha: { $gte: inicioMes, $lt: finMes } } },
      { $group: { _id: null, total: { $sum: "$monto" } } },
    ]);
    const decision = decidirCircuitoRendicion({ monto, presupuesto: proyecto.presupuestoTotal, reglasBasicasCumplidas, acumuladoAutomaticoMes: acumulado[0]?.total || 0, umbralAutoPct: UMBRAL_AUTO_APROBACION_PCT, umbralMesaPct: UMBRAL_MESA_COORDINADORA_PCT, topeMensualAutoPct: TOPE_MENSUAL_AUTO_PCT });
    const estado = decision.estado;
    const aprobadoAutomaticamente = decision.aprobadoAutomaticamente;
    const requiereMesa = decision.requiereMesa;
    const observacion = !fechaValida ? "La fecha del comprobante está fuera del período del proyecto." : !rubroValido ? "El rubro no forma parte del presupuesto aprobado y requiere revisión de Auditoría." : decision.observacion;

    const gasto = await Gasto.create({
      proyecto: proyecto._id, monto, fecha, descripcion: datos.descripcion.trim(), rubro: datos.rubro.trim(),
      comprobante: { nombre: String(archivo.originalname || "comprobante").replace(/[\\/\0]/g, "_").slice(0, 180), mimeType: archivo.mimetype, tamanio: archivo.size, contenido: archivo.buffer },
      estado, observacion, porcentajePresupuesto, reglasBasicasCumplidas,
      cargadoPor: usuario._id, requiereMesa, aprobadoAutomaticamente,
      ...(aprobadoAutomaticamente ? { fechaAprobacion: new Date() } : {}),
    });
    return gasto;
  }

  revisar(gastoId, usuario, accion, observacion = "") {
    return conBloqueo(`rendicion:${gastoId}`, () => this.#revisar(gastoId, usuario, accion, observacion));
  }

  async #revisar(gastoId, usuario, accion, observacion) {
    const gasto = await Gasto.findById(gastoId);
    if (!gasto) throw ApiError.notFound("No existe la rendición solicitada.");
    if (String(gasto.cargadoPor) === String(usuario._id)) throw ApiError.forbidden("No podés aprobar ni observar una rendición que cargaste.");
    if (gasto.estado === "aprobado" || gasto.estado === "observado") throw ApiError.conflict("La rendición ya tiene una resolución final.");

    if (usuario.rol === "auditoria") {
      if (gasto.estado === "pendiente_mesa") throw ApiError.forbidden("Esta rendición ya fue revisada por Auditoría y espera a la Mesa Coordinadora.");
      if (accion === "observar") {
        if (!String(observacion).trim()) throw ApiError.badRequest("La observación es obligatoria.");
        gasto.estado = "observado"; gasto.observacion = String(observacion).trim(); gasto.revisadoPor = usuario._id; gasto.fechaRevision = new Date();
      } else if (accion === "aprobar") {
        if (gasto.requiereMesa) {
          gasto.estado = "pendiente_mesa"; gasto.revisadoPor = usuario._id; gasto.fechaRevision = new Date();
        } else {
          gasto.estado = "aprobado"; gasto.revisadoPor = usuario._id; gasto.aprobadoPor = usuario._id; gasto.fechaRevision = new Date(); gasto.fechaAprobacion = new Date();
        }
      } else throw ApiError.badRequest("Acción de revisión no válida.");
    } else if (usuario.rol === "mesa_coordinadora") {
      if (!gasto.requiereMesa || gasto.estado !== "pendiente_mesa") throw ApiError.forbidden("La rendición no está pendiente de decisión de la Mesa Coordinadora.");
      if (accion === "observar") {
        if (!String(observacion).trim()) throw ApiError.badRequest("La observación es obligatoria.");
        gasto.estado = "observado"; gasto.observacion = String(observacion).trim();
      } else if (accion === "aprobar") {
        gasto.estado = "aprobado"; gasto.aprobadoPor = usuario._id; gasto.fechaAprobacion = new Date();
      } else throw ApiError.badRequest("Acción de revisión no válida.");
    } else throw ApiError.forbidden("Solo Auditoría o Mesa Coordinadora pueden resolver rendiciones.");

    await gasto.save();
    return gasto;
  }
}
export default new RendicionService();
