import Usuario from "../models/Usuario.js";
import Organizacion from "../models/Organizacion.js";
import Proyecto from "../models/Proyecto.js";
import Donante from "../models/Donante.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import Campania from "../models/Campania.js";
import Notificacion from "../models/Notificacion.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ROLE_LABELS, ROLE_VALUES } from "../config/security.js";

export const dashboard = asyncHandler(async (req, res) => {
  const [usuarios, organizaciones, proyectos, donantes, donaciones, gastos, pendientes, campanias, notificacionesPendientes] = await Promise.all([
    Usuario.countDocuments(), Organizacion.countDocuments(), Proyecto.countDocuments(), Donante.countDocuments(),
    Donacion.countDocuments(), Gasto.countDocuments(), Gasto.countDocuments({ estado: { $in: ["en_revision", "pendiente_mesa", "recibido"] } }), Campania.countDocuments(), Notificacion.countDocuments({ estado: "pendiente" }),
  ]);
  res.render("admin/dashboard", { titulo: "Panel de control | SumarImpacto", metricas: { usuarios, organizaciones, proyectos, donantes, donaciones, gastos, pendientes, campanias, notificacionesPendientes } });
});

export const listarUsuarios = asyncHandler(async (_req, res) => {
  const [usuarios, organizaciones] = await Promise.all([Usuario.find().populate("organizacion", "nombre").sort({ createdAt: -1 }), Organizacion.find().sort({ nombre: 1 })]);
  res.render("admin/usuarios", { titulo: "Usuarios | SumarImpacto", usuarios, organizaciones, roles: ROLE_LABELS });
});

export const crearUsuario = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol, organizacion } = req.body;
  if (!ROLE_VALUES.includes(rol)) throw ApiError.badRequest("El rol seleccionado no es válido.");
  if (password !== req.body.confirmarPassword) throw ApiError.badRequest("Las contraseñas no coinciden.");
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw ApiError.badRequest("La contraseña debe tener 12 caracteres e incluir mayúscula, minúscula, número y símbolo.");
  }
  if (rol === "referente_territorial" && !organizacion) throw ApiError.badRequest("El referente territorial debe estar asociado a una organización.");
  if (organizacion && !(await Organizacion.exists({ _id: organizacion }))) throw ApiError.badRequest("La organización seleccionada no existe.");
  await Usuario.create({ nombre, email, password, rol, organizacion: organizacion || null });
  res.redirect("/admin/usuarios");
});

export const cambiarEstadoUsuario = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw ApiError.conflict("No podés desactivar tu propio usuario.");
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) throw ApiError.notFound("Usuario inexistente.");
  usuario.activo = !usuario.activo;
  usuario.refreshTokenHash = null;
  await usuario.save();
  res.redirect("/admin/usuarios");
});

export const listarRendiciones = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.user.rol === "referente_territorial") {
    const proyectos = await Proyecto.find({ organizacion: req.user.organizacion }).select("_id");
    filtro.proyecto = { $in: proyectos.map((p) => p._id) };
  }
  if (req.query.estado) filtro.estado = req.query.estado;
  const rendiciones = await Gasto.find(filtro).select("-comprobante.contenido").populate("proyecto", "nombre organizacion").populate("cargadoPor", "nombre email").populate("revisadoPor", "nombre").populate("aprobadoPor", "nombre").sort({ createdAt: -1 });
  res.render("rendiciones/lista", { titulo: "Rendiciones | SumarImpacto", rendiciones, queryEstado: req.query.estado || "" });
});

export const revisarRendicion = asyncHandler(async (req, res) => {
  const rendicionService = (await import("../services/RendicionService.js")).default;
  await rendicionService.revisar(req.params.id, req.user, req.body.accion, req.body.observacion || "");
  res.redirect("/rendiciones");
});

export const descargarComprobante = asyncHandler(async (req, res) => {
  const gasto = await Gasto.findById(req.params.id).select("+comprobante.contenido");
  if (!gasto || !gasto.comprobante?.contenido) throw ApiError.notFound("No existe el comprobante solicitado.");
  if (req.user.rol === "referente_territorial") {
    const proyecto = await Proyecto.findById(gasto.proyecto).select("organizacion");
    if (!proyecto || String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  }
  res.set("Content-Type", gasto.comprobante.mimeType);
  res.set("Content-Disposition", `inline; filename="${encodeURIComponent(gasto.comprobante.nombre)}"`);
  res.set("X-Content-Type-Options", "nosniff");
  res.send(gasto.comprobante.contenido);
});

export const formularioNuevaCampania = (_req, res) => res.render("admin/campania", { titulo: "Nueva campaña | SumarImpacto", modo: "crear", campania: {} });
export const formularioEditarCampania = asyncHandler(async (req, res) => {
  const campania = await Campania.findById(req.params.id);
  if (!campania) throw ApiError.notFound("Campaña inexistente.");
  res.render("admin/campania", { titulo: `Editar ${campania.nombre}`, modo: "editar", campania });
});
export const crearCampania = asyncHandler(async (req, res) => {
  await Campania.create({ nombre: req.body.nombre, descripcion: req.body.descripcion, meta: req.body.meta, fechaInicio: req.body.fechaInicio, fechaFin: req.body.fechaFin });
  res.redirect("/admin/campanias");
});
export const actualizarCampania = asyncHandler(async (req, res) => {
  const campania = await Campania.findById(req.params.id);
  if (!campania) throw ApiError.notFound("Campaña inexistente.");
  campania.set({ nombre: req.body.nombre, descripcion: req.body.descripcion, meta: req.body.meta, fechaInicio: req.body.fechaInicio, fechaFin: req.body.fechaFin });
  await campania.save();
  res.redirect("/admin/campanias");
});
export const cambiarEstadoCampania = asyncHandler(async (req, res) => {
  const campania = await Campania.findById(req.params.id);
  if (!campania) throw ApiError.notFound("Campaña inexistente.");
  campania.activa = !campania.activa;
  await campania.save();
  res.redirect("/admin/campanias");
});
export const listarCampanias = asyncHandler(async (_req, res) => {
  const campanias = await Campania.find().sort({ fechaInicio: -1 });
  res.render("admin/campanias", { titulo: "Campañas | SumarImpacto", campanias });
});
export const reporteCampania = asyncHandler(async (req, res) => {
  const campania = await Campania.findById(req.params.id);
  if (!campania) throw ApiError.notFound("Campaña inexistente.");
  const haceUnAnio = new Date(); haceUnAnio.setUTCFullYear(haceUnAnio.getUTCFullYear() - 1);
  const desde = campania.fechaInicio > haceUnAnio ? campania.fechaInicio : haceUnAnio;
  const hasta = campania.fechaFin < new Date() ? campania.fechaFin : new Date();
  const [resultado] = await Donacion.aggregate([
    { $match: { campania: campania._id, fecha: { $gte: desde, $lte: hasta } } },
    { $group: { _id: null, totalRecaudado: { $sum: "$monto" }, cantidadDonaciones: { $sum: 1 } } },
  ]);
  const total = resultado?.totalRecaudado || 0;
  res.render("admin/reporte-campania", { titulo: `Reporte ${campania.nombre}`, campania, total, cantidad: resultado?.cantidadDonaciones || 0, desde, hasta, porcentaje: campania.meta > 0 ? Math.min(100, (total / campania.meta) * 100) : 0 });
});

export const apiListarUsuarios = asyncHandler(async (_req, res) => {
  const usuarios = await Usuario.find().populate("organizacion", "nombre").sort({ createdAt: -1 });
  res.json({ datos: usuarios, total: usuarios.length });
});
export const apiCrearUsuario = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol, organizacion } = req.body;
  if (!ROLE_VALUES.includes(rol)) throw ApiError.badRequest("El rol seleccionado no es válido.");
  if (rol === "referente_territorial" && !organizacion) throw ApiError.badRequest("El referente territorial debe estar asociado a una organización.");
  if (organizacion && !(await Organizacion.exists({ _id: organizacion }))) throw ApiError.badRequest("La organización seleccionada no existe.");
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw ApiError.badRequest("La contraseña debe tener 12 caracteres e incluir mayúscula, minúscula, número y símbolo.");
  const usuario = await Usuario.create({ nombre, email, password, rol, organizacion: organizacion || null });
  res.status(201).json({ mensaje: "Usuario creado.", usuario });
});

export const exportarReporteCampaniaPdf = asyncHandler(async (req, res) => {
  const campania = await Campania.findById(req.params.id);
  if (!campania) throw ApiError.notFound("Campaña inexistente.");
  const haceUnAnio = new Date(); haceUnAnio.setUTCFullYear(haceUnAnio.getUTCFullYear() - 1);
  const desde = campania.fechaInicio > haceUnAnio ? campania.fechaInicio : haceUnAnio;
  const hasta = campania.fechaFin < new Date() ? campania.fechaFin : new Date();
  const [resultado] = await Donacion.aggregate([
    { $match: { campania: campania._id, fecha: { $gte: desde, $lte: hasta } } },
    { $group: { _id: null, totalRecaudado: { $sum: "$monto" }, cantidadDonaciones: { $sum: 1 } } },
  ]);
  const total = resultado?.totalRecaudado || 0;
  const PDFDocument = (await import("pdfkit")).default;
  const pdf = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Reporte ${campania.nombre}`, Author: "Red SumarImpacto" } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="reporte-campania-${campania._id}.pdf"`);
  pdf.pipe(res);
  pdf.fontSize(20).text("Red SumarImpacto", { continued: false });
  pdf.moveDown().fontSize(16).text(`Reporte de campaña: ${campania.nombre}`);
  pdf.moveDown().fontSize(11).text(`Período informado: ${desde.toLocaleDateString("es-AR")} al ${hasta.toLocaleDateString("es-AR")}`);
  pdf.moveDown().fontSize(13).text(`Meta: $${campania.meta.toLocaleString("es-AR")}`);
  pdf.text(`Total recaudado: $${total.toLocaleString("es-AR")}`);
  pdf.text(`Cantidad de donaciones: ${resultado?.cantidadDonaciones || 0}`);
  pdf.text(`Cumplimiento: ${campania.meta > 0 ? (total / campania.meta * 100).toFixed(2) : "0.00"}%`);
  pdf.moveDown().fontSize(9).fillColor("#555555").text("Reporte generado por el sistema de gestión de Red SumarImpacto.");
  pdf.end();
});
