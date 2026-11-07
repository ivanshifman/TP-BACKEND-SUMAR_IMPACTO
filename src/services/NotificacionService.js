import nodemailer from "nodemailer";
import Donacion from "../models/Donacion.js";
import Notificacion from "../models/Notificacion.js";
import { crearTokenComprobante } from "../utils/publicReceiptToken.js";

let transport;
let ejecutando = false;
const MAX_INTENTOS = 4; // envío inicial + tres reintentos
const escaparHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\'": "&#39;" })[char]);

function obtenerTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  if (!transport) transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  return transport;
}

function proximaFecha(frecuencia) {
  const now = new Date();
  if (frecuencia === "semanal") {
    const days = ((8 - now.getUTCDay()) % 7) || 7;
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 9));
    return date;
  }
  if (frecuencia === "mensual") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 9));
  return now;
}

class NotificacionService {
  async encolarPorRendicion(gasto) {
    const donaciones = await Donacion.find({ proyecto: gasto.proyecto }).populate("donante", "nombre email frecuenciaNotificacion");
    const documentos = donaciones.filter((d) => d.donante?.email).map((d) => ({
      donante: d.donante._id, gasto: gasto._id, destinatario: d.donante.email,
      programadaPara: proximaFecha(d.donante.frecuenciaNotificacion || "inmediata"),
    }));
    if (documentos.length) await Notificacion.insertMany(documentos, { ordered: false }).catch((error) => {
      const writeErrors = error.writeErrors || [];
      const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((item) => item.code === 11000);
      if (!onlyDuplicates && error.code !== 11000) throw error;
    });
  }

  async procesarPendientes() {
    const mailer = obtenerTransport();
    if (!mailer || ejecutando) return;
    ejecutando = true;
    try {
      const now = new Date();
      const grupos = await Notificacion.aggregate([
        { $match: { estado: "pendiente", programadaPara: { $lte: now }, proximoIntento: { $lte: now } } },
        { $group: { _id: "$donante", ids: { $push: "$_id" }, destinatario: { $first: "$destinatario" } } },
        { $limit: Number(process.env.NOTIFICATION_BATCH_SIZE || 250) },
      ]);
      const concurrency = 10;
      for (let i = 0; i < grupos.length; i += concurrency) await Promise.all(grupos.slice(i, i + concurrency).map((grupo) => this.enviarGrupo(mailer, grupo)));
    } catch (error) { console.error("Error procesando cola de notificaciones:", error.message); }
    finally { ejecutando = false; }
  }

  async enviarGrupo(mailer, grupo) {
    const notificaciones = await Notificacion.find({ _id: { $in: grupo.ids }, estado: "pendiente" }).populate({ path: "gasto", populate: { path: "proyecto", select: "nombre" } }).populate("donante", "nombre");
    if (!notificaciones.length) return;
    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) throw new Error("Falta APP_BASE_URL para generar enlaces seguros a comprobantes.");
    const filas = notificaciones.map((item) => {
      const gasto = item.gasto;
      const token = crearTokenComprobante(gasto._id);
      const url = `${baseUrl.replace(/\/$/, "")}/comprobantes/public/${token}`;
      return `<li><strong>${escaparHtml(gasto.proyecto?.nombre || "Proyecto")}</strong>: $${gasto.monto.toLocaleString("es-AR")} — ${escaparHtml(gasto.descripcion)}. <a href="${url}">Ver comprobante</a></li>`;
    }).join("");
    try {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: grupo.destinatario,
        subject: notificaciones.length === 1 ? "SumarImpacto: ejecución de fondos" : "SumarImpacto: resumen de ejecución de fondos",
        html: `<p>Hola ${escaparHtml(notificaciones[0].donante?.nombre || "")},</p><p>Se registraron gastos aprobados en proyectos que acompañaste:</p><ul>${filas}</ul><p>Red SumarImpacto</p>`,
        text: `Se aprobaron ${notificaciones.length} rendición/es en proyectos que acompañaste. Ingresá al sistema para consultar los comprobantes.`,
      });
      await Notificacion.updateMany({ _id: { $in: grupo.ids } }, { $set: { estado: "enviada", enviadaEn: new Date(), ultimoError: null } });
    } catch (error) {
      const actualizadas = notificaciones.map((item) => {
        const intentos = item.intentos + 1;
        return Notificacion.updateOne({ _id: item._id }, { $set: { intentos, ultimoError: String(error.message).slice(0, 500), estado: intentos >= MAX_INTENTOS ? "fallida" : "pendiente", proximoIntento: new Date(Date.now() + 5 * 60 * 1000) } });
      });
      await Promise.all(actualizadas);
    }
  }

  iniciarWorker() {
    if (!obtenerTransport() || !process.env.APP_BASE_URL || !process.env.COMPROBANTE_LINK_SECRET || process.env.COMPROBANTE_LINK_SECRET.length < 32) { console.warn("Notificaciones por email desactivadas: configurá SMTP, APP_BASE_URL y COMPROBANTE_LINK_SECRET (32 caracteres como mínimo)."); return null; }
    const timer = setInterval(() => this.procesarPendientes(), 15000);
    timer.unref?.();
    void this.procesarPendientes();
    return timer;
  }
}
export default new NotificacionService();
