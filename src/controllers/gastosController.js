import Gasto from "../models/Gasto.js";
import Proyecto from "../models/Proyecto.js";
import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";
import rendicionService from "../services/RendicionService.js";

export const listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.proyectoId) filtro.proyecto = req.query.proyectoId;
  if (req.query.estado) filtro.estado = req.query.estado;
  if (req.user.rol === "referente_territorial") {
    const proyectos = await Proyecto.find({ organizacion: req.user.organizacion }).select("_id");
    filtro.proyecto = { $in: proyectos.map((p) => p._id) };
  }
  const gastos = await Gasto.find(filtro).select("-comprobante.contenido").populate("proyecto", "nombre").populate("cargadoPor", "nombre").sort({ fecha: -1 });
  res.status(httpStatus.OK).json(gastos);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const gasto = await Gasto.findById(req.params.id).select("-comprobante.contenido").populate("proyecto", "nombre");
  if (!gasto) throw ApiError.notFound(`No existe una rendición con id ${req.params.id}.`);
  if (req.user.rol === "referente_territorial") {
    const proyecto = await Proyecto.findById(gasto.proyecto._id).select("organizacion");
    if (!proyecto || String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  }
  res.status(httpStatus.OK).json(gasto);
});

export const crear = asyncHandler(async (req, res) => {
  const gasto = await rendicionService.registrar({ datos: req.body, archivo: req.file, usuario: req.user });
  res.status(httpStatus.CREATED).json({ mensaje: gasto.estado === "aprobado" ? "Rendición aprobada automáticamente." : "Rendición registrada y enviada a revisión.", rendicion: gasto });
});

export const revisar = asyncHandler(async (req, res) => {
  const gasto = await rendicionService.revisar(req.params.id, req.user, req.body.accion, req.body.observacion || "");
  res.status(httpStatus.OK).json({ mensaje: "Rendición actualizada.", rendicion: gasto });
});

export default { listar, obtenerPorId, crear, revisar };
