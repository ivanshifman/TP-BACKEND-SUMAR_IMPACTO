import Usuario from "../models/Usuario.js";
import Organizacion from "../models/Organizacion.js";
import Proyecto from "../models/Proyecto.js";
import Donante from "../models/Donante.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import Campania from "../models/Campania.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ROLE_LABELS, ROLES } from "../config/security.js";
import usuarioService from "../services/UsuarioService.js";
import proyectoService from "../services/ProyectoService.js";
import rendicionService from "../services/RendicionService.js";
import campaniaService from "../services/CampaniaService.js";
import auditoriaService from "../services/AuditoriaService.js";

// ── Panel ────────────────────────────────────────────────────────────────────────────────

export const dashboard = asyncHandler(async (req, res) => {
  const [usuarios, organizaciones, proyectos, donantes, donaciones, gastos, pendientes, campanias] = await Promise.all([
    Usuario.countDocuments(), Organizacion.countDocuments(), Proyecto.countDocuments(), Donante.countDocuments(),
    Donacion.countDocuments(), Gasto.countDocuments(), Gasto.countDocuments({ estado: { $in: ["en_revision", "pendiente_mesa", "recibido"] } }), Campania.countDocuments(),
  ]);
  res.render("admin/dashboard", { titulo: "Panel de control | SumarImpacto", metricas: { usuarios, organizaciones, proyectos, donantes, donaciones, gastos, pendientes, campanias } });
});

// ── Usuarios (interfaz web) ──────────────────────────────────────────────────────────────

const datosDePerfil = (body) => ({ nombre: body.nombre, rol: body.rol, organizacion: body.organizacion || null });

export const listarUsuarios = asyncHandler(async (_req, res) => {
  const [usuarios, organizaciones] = await Promise.all([Usuario.find().populate("organizacion", "nombre").sort({ createdAt: -1 }), Organizacion.find().sort({ nombre: 1 })]);
  res.render("admin/usuarios", { titulo: "Usuarios | SumarImpacto", usuarios, organizaciones, roles: ROLE_LABELS });
});

export const crearUsuario = asyncHandler(async (req, res) => {
  if (req.body.password !== req.body.confirmarPassword) throw ApiError.badRequest("Las contraseñas no coinciden.");
  await usuarioService.crear({ ...datosDePerfil(req.body), email: req.body.email, password: req.body.password });
  res.redirect("/admin/usuarios");
});

export const formularioEditarUsuario = asyncHandler(async (req, res) => {
  const [usuario, organizaciones] = await Promise.all([usuarioService.obtenerOFallar(req.params.id), Organizacion.find().sort({ nombre: 1 })]);
  res.render("admin/usuario-editar", { titulo: `Editar ${usuario.nombre} | SumarImpacto`, usuario, organizaciones, roles: ROLE_LABELS });
});

export const actualizarUsuario = asyncHandler(async (req, res) => {
  await usuarioService.actualizar(req.params.id, datosDePerfil(req.body), req.user);
  res.redirect("/admin/usuarios");
});

export const cambiarEstadoUsuario = asyncHandler(async (req, res) => {
  await usuarioService.cambiarEstado(req.params.id, req.user);
  res.redirect("/admin/usuarios");
});

export const resetearPassword = asyncHandler(async (req, res) => {
  if (req.body.passwordNueva !== req.body.confirmarPassword) throw ApiError.badRequest("Las contraseñas no coinciden.");
  await usuarioService.resetearPassword(req.params.id, req.body.passwordNueva, req.user);
  res.redirect("/admin/usuarios");
});

// ── Usuarios (API) ───────────────────────────────────────────────────────────────────────

export const apiListarUsuarios = asyncHandler(async (_req, res) => {
  const usuarios = await Usuario.find().populate("organizacion", "nombre").sort({ createdAt: -1 });
  res.json({ datos: usuarios, total: usuarios.length });
});

export const apiCrearUsuario = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.crear({ ...datosDePerfil(req.body), email: req.body.email, password: req.body.password });
  res.status(201).json({ mensaje: "Usuario creado. Deberá cambiar su contraseña al ingresar.", usuario });
});

export const apiActualizarUsuario = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.actualizar(req.params.id, datosDePerfil(req.body), req.user);
  res.json({ mensaje: "Usuario actualizado.", usuario });
});

export const apiCambiarEstadoUsuario = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.cambiarEstado(req.params.id, req.user);
  res.json({ mensaje: usuario.activo ? "Usuario activado." : "Usuario desactivado.", usuario });
});

export const apiResetearPassword = asyncHandler(async (req, res) => {
  await usuarioService.resetearPassword(req.params.id, req.body.passwordNueva, req.user);
  res.json({ mensaje: "Contraseña restablecida. La persona deberá cambiarla al ingresar." });
});

// ── Rendiciones ──────────────────────────────────────────────────────────────────────────

export const listarRendiciones = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.user.rol === ROLES.REFERENTE) filtro.proyecto = { $in: await proyectoService.idsDeProyectosDeLaOrganizacion(req.user) };
  if (req.query.estado) filtro.estado = req.query.estado;
  const rendiciones = await Gasto.find(filtro).select("-comprobante.contenido").populate("proyecto", "nombre organizacion").populate("cargadoPor", "nombre email").populate("revisadoPor", "nombre").populate("aprobadoPor", "nombre").sort({ createdAt: -1 });
  res.render("rendiciones/lista", { titulo: "Rendiciones | SumarImpacto", rendiciones, queryEstado: req.query.estado || "" });
});

export const revisarRendicion = asyncHandler(async (req, res) => {
  await rendicionService.revisar(req.params.id, req.user, req.body.accion, req.body.observacion || "");
  res.redirect("/rendiciones");
});

export const descargarComprobante = asyncHandler(async (req, res) => {
  const gasto = await Gasto.findById(req.params.id).select("+comprobante.contenido");
  if (!gasto || !gasto.comprobante?.contenido) throw ApiError.notFound("No existe el comprobante solicitado.");
  if (req.user.rol === ROLES.REFERENTE) {
    const proyecto = await Proyecto.findById(gasto.proyecto).select("organizacion");
    if (!proyecto) throw ApiError.forbidden();
    proyectoService.validarAcceso(proyecto, req.user);
  }
  // El archivo es un PDF o imagen validado por firma binaria y se sirve con nosniff: se retira la
  // política CSP de la aplicación para que el visor del navegador pueda mostrarlo.
  res.removeHeader("Content-Security-Policy");
  res.set("Content-Type", gasto.comprobante.mimeType);
  res.set("Content-Disposition", `inline; filename="${encodeURIComponent(gasto.comprobante.nombre)}"`);
  res.set("X-Content-Type-Options", "nosniff");
  res.send(gasto.comprobante.contenido);
});

// ── Campañas ─────────────────────────────────────────────────────────────────────────────

const datosDeCampania = (body) => ({ nombre: body.nombre, descripcion: body.descripcion, meta: body.meta, fechaInicio: body.fechaInicio, fechaFin: body.fechaFin });

const campaniaOFallar = async (id) => {
  const campania = await Campania.findById(id);
  if (!campania) throw ApiError.notFound("Campaña inexistente.");
  return campania;
};

export const formularioNuevaCampania = (_req, res) => res.render("admin/campania", { titulo: "Nueva campaña | SumarImpacto", modo: "crear", campania: {} });
export const formularioEditarCampania = asyncHandler(async (req, res) => {
  const campania = await campaniaOFallar(req.params.id);
  res.render("admin/campania", { titulo: `Editar ${campania.nombre}`, modo: "editar", campania });
});
export const crearCampania = asyncHandler(async (req, res) => {
  await Campania.create(datosDeCampania(req.body));
  res.redirect("/admin/campanias");
});
export const actualizarCampania = asyncHandler(async (req, res) => {
  const campania = await campaniaOFallar(req.params.id);
  campania.set(datosDeCampania(req.body));
  await campania.save();
  res.redirect("/admin/campanias");
});
export const cambiarEstadoCampania = asyncHandler(async (req, res) => {
  const campania = await campaniaOFallar(req.params.id);
  campania.activa = !campania.activa;
  await campania.save();
  res.redirect("/admin/campanias");
});
export const listarCampanias = asyncHandler(async (_req, res) => {
  const campanias = await Campania.find().sort({ fechaInicio: -1 });
  res.render("admin/campanias", { titulo: "Campañas | SumarImpacto", campanias });
});

export const reporteCampania = asyncHandler(async (req, res) => {
  const campania = await campaniaOFallar(req.params.id);
  const { total, cantidad, desde, hasta, porcentaje } = await campaniaService.resumen(campania);
  res.render("admin/reporte-campania", { titulo: `Reporte ${campania.nombre}`, campania, total, cantidad, desde, hasta, porcentaje });
});

export const exportarReporteCampaniaPdf = asyncHandler(async (req, res) => {
  const campania = await campaniaOFallar(req.params.id);
  const { total, cantidad, desde, hasta, cumplimiento } = await campaniaService.resumen(campania);
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
  pdf.text(`Cantidad de donaciones: ${cantidad}`);
  pdf.text(`Cumplimiento: ${cumplimiento.toFixed(2)}%`);
  pdf.moveDown().fontSize(9).fillColor("#555555").text("Reporte generado por el sistema de gestión de Red SumarImpacto.");
  pdf.end();
});

// ── Bitácora de auditoría ────────────────────────────────────────────────────────────────

const consultaDeAuditoria = (query) => ({ pagina: query.pagina, limite: query.limite, metodo: query.metodo, resultado: query.resultado, email: query.email });

export const listarAuditoria = asyncHandler(async (req, res) => {
  const resultado = await auditoriaService.listar(consultaDeAuditoria(req.query));
  res.render("admin/auditoria", { titulo: "Bitácora de auditoría | SumarImpacto", ...resultado, filtros: { metodo: req.query.metodo || "", resultado: req.query.resultado || "", email: req.query.email || "" } });
});

export const apiListarAuditoria = asyncHandler(async (req, res) => {
  res.json(await auditoriaService.listar(consultaDeAuditoria(req.query)));
});
