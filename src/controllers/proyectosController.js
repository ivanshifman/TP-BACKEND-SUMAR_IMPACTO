import Proyecto from "../models/Proyecto.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import proyectoService from "../services/ProyectoService.js";
import httpStatus from "../utils/httpStatus.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req, res) => {
  const { organizacionId } = req.query;
  const filtro = organizacionId ? { organizacion: organizacionId } : {};
  if (req.user?.rol === "referente_territorial") filtro.organizacion = req.user.organizacion;
  filtro.activo = { $ne: false };
  const proyectos = await Proyecto.find(filtro).populate("organizacion", "nombre").sort({ nombre: 1 });
  res.status(httpStatus.OK).json(proyectos);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.user?.rol === "referente_territorial" && String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  res.status(httpStatus.OK).json(proyecto);
});

export const crear = asyncHandler(async (req, res) => {
  await proyectoService.validarOrganizacionExiste(req.body.organizacion);
  const creado = await Proyecto.create({ nombre: req.body.nombre, organizacion: req.body.organizacion, montoObjetivo: req.body.montoObjetivo, presupuestoTotal: req.body.presupuestoTotal, periodoInicio: req.body.periodoInicio, periodoFin: req.body.periodoFin, rubros: req.body.rubros });
  res.status(httpStatus.CREATED).json(creado);
});

export const actualizar = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.body.organizacion) {
    await proyectoService.validarOrganizacionExiste(req.body.organizacion);
  }
  const actualizado = await Proyecto.findById(req.params.id);
  actualizado.set({ nombre: req.body.nombre, organizacion: req.body.organizacion, montoObjetivo: req.body.montoObjetivo, presupuestoTotal: req.body.presupuestoTotal, periodoInicio: req.body.periodoInicio, periodoFin: req.body.periodoFin, rubros: req.body.rubros });
  await actualizado.save();
  res.status(httpStatus.OK).json(actualizado);
});

export const eliminar = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  const [donaciones, gastos] = await Promise.all([Donacion.exists({ proyecto: req.params.id }), Gasto.exists({ proyecto: req.params.id })]);
  if (donaciones || gastos) throw ApiError.conflict("No se puede eliminar un proyecto con movimientos asociados. Desactivalo o archivá su información.");
  await Proyecto.findByIdAndDelete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

export const saldo = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.user?.rol === "referente_territorial" && String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  const resultado = await proyectoService.calcularSaldoDisponible(req.params.id);
  res.status(httpStatus.OK).json(resultado);
});

export const donaciones = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.user?.rol === "referente_territorial" && String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  const resultado = await Donacion.find({ proyecto: req.params.id })
    .populate("donante", "nombre tipo")
    .sort({ fecha: 1 });
  res.status(httpStatus.OK).json(resultado);
});

export const gastos = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.user?.rol === "referente_territorial" && String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  const resultado = await Gasto.find({ proyecto: req.params.id }).sort({ fecha: 1 });
  res.status(httpStatus.OK).json(resultado);
});

export default { listar, obtenerPorId, crear, actualizar, eliminar, saldo, donaciones, gastos };
