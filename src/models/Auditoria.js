import mongoose from "mongoose";

const { Schema, model } = mongoose;

const auditoriaSchema = new Schema({
  fecha: { type: Date, default: Date.now, index: true },
  usuario: { type: Schema.Types.ObjectId, ref: "Usuario", default: null },
  email: { type: String, default: null },
  rol: { type: String, default: null },
  metodo: { type: String, required: true, enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
  ruta: { type: String, required: true, maxlength: 300 },
  recursoId: { type: String, default: null },
  estado: { type: Number, required: true },
  resultado: { type: String, required: true, enum: ["ok", "rechazado", "error"] },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null, maxlength: 200 },
}, { versionKey: false });

export const Auditoria = model("Auditoria", auditoriaSchema);
export default Auditoria;
