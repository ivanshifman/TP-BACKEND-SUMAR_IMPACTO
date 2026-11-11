import Proyecto from "../models/Proyecto.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import proyectoService from "../services/ProyectoService.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ROLES } from "../config/security.js";

// Campos que se aceptan del cuerpo de la solicitud (lista cerrada: evita asignación masiva).
const datosDelCuerpo = (body) => ({
  nombre: body.nombre,
  organizacion: body.organizacion,
  montoObjetivo: body.montoObjetivo,
  presupuestoTotal: body.presupuestoTotal,
  periodoInicio: body.periodoInicio,
  periodoFin: body.periodoFin,
  rubros: body.rubros,
});

export const listar = asyncHandler(async (req, res) => {
  const { organizacionId } = req.query;
  const filtro = organizacionId ? { organizacion: organizacionId } : {};
  if (req.user?.rol === ROLES.REFERENTE) filtro.organizacion = req.user.organizacion;
  filtro.activo = { $ne: false };
  const proyectos = await Proyecto.find(filtro).populate("organizacion", "nombre").sort({ nombre: 1 });
  res.status(httpStatus.OK).json(proyectos);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  proyectoService.validarAcceso(proyecto, req.user);
  res.status(httpStatus.OK).json(proyecto);
});

export const crear = asyncHandler(async (req, res) => {
  const creado = await proyectoService.crear(datosDelCuerpo(req.body));
  res.status(httpStatus.CREATED).json(creado);
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizado = await proyectoService.actualizar(req.params.id, datosDelCuerpo(req.body));
  res.status(httpStatus.OK).json(actualizado);
});

export const cambiarEstado = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.cambiarActivo(req.params.id, req.body.activo);
  res.status(httpStatus.OK).json(proyecto);
});

export const eliminar = asyncHandler(async (req, res) => {
  await proyectoService.eliminar(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

export const saldo = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  proyectoService.validarAcceso(proyecto, req.user);
  res.status(httpStatus.OK).json(await proyectoService.calcularSaldoDisponible(req.params.id));
});

export const donaciones = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  proyectoService.validarAcceso(proyecto, req.user);
  const resultado = await Donacion.find({ proyecto: req.params.id }).populate("donante", "nombre tipo").sort({ fecha: 1 });
  res.status(httpStatus.OK).json(resultado);
});

export const gastos = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  proyectoService.validarAcceso(proyecto, req.user);
  res.status(httpStatus.OK).json(await Gasto.find({ proyecto: req.params.id }).sort({ fecha: 1 }));
});

export default { listar, obtenerPorId, crear, actualizar, cambiarEstado, eliminar, saldo, donaciones, gastos };
