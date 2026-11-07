import mongoose from "mongoose";
const { Schema, model } = mongoose;
const notificacionSchema = new Schema({
  donante: { type: Schema.Types.ObjectId, ref: "Donante", required: true, index: true },
  gasto: { type: Schema.Types.ObjectId, ref: "Gasto", required: true },
  destinatario: { type: String, required: true, lowercase: true, trim: true },
  programadaPara: { type: Date, required: true, index: true },
  estado: { type: String, enum: ["pendiente", "enviada", "fallida"], default: "pendiente", index: true },
  intentos: { type: Number, default: 0, min: 0 },
  proximoIntento: { type: Date, default: Date.now },
  ultimoError: { type: String, maxlength: 500, default: null },
  enviadaEn: { type: Date, default: null },
}, { timestamps: true });
notificacionSchema.index({ donante: 1, gasto: 1 }, { unique: true });
notificacionSchema.index({ estado: 1, programadaPara: 1, proximoIntento: 1 });
export default model("Notificacion", notificacionSchema);
