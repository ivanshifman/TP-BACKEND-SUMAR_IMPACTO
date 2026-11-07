import Gasto from "../models/Gasto.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verificarTokenComprobante } from "../utils/publicReceiptToken.js";
export const descargar = asyncHandler(async (req, res) => {
  let gastoId;
  try { gastoId = verificarTokenComprobante(req.params.token); } catch { throw ApiError.unauthorized("El enlace al comprobante no es válido o venció."); }
  const gasto = await Gasto.findOne({ _id: gastoId, estado: "aprobado" }).select("+comprobante.contenido");
  if (!gasto?.comprobante?.contenido) throw ApiError.notFound("El comprobante no está disponible.");
  res.set("Content-Type", gasto.comprobante.mimeType);
  res.set("Content-Disposition", `inline; filename="${encodeURIComponent(gasto.comprobante.nombre)}"`);
  res.set("Cache-Control", "private, no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.send(gasto.comprobante.contenido);
});
