import mongoose from "mongoose";

const { Schema, model } = mongoose;

const comprobanteSchema = new Schema({ nombre: { type: String, required: true }, mimeType: { type: String, required: true }, tamanio: { type: Number, required: true }, contenido: { type: Buffer, required: true, select: false } }, { _id: false });
const gastoSchema = new Schema({
  proyecto: { type: Schema.Types.ObjectId, ref: "Proyecto", required: true, index: true },
  monto: { type: Number, required: true, min: 0.01 },
  descripcion: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
  fecha: { type: Date, required: true },
  rubro: { type: String, required: true, trim: true, maxlength: 80 },
  comprobante: { type: comprobanteSchema, required: true },
  estado: { type: String, enum: ["recibido", "en_revision", "pendiente_mesa", "aprobado", "observado"], default: "recibido", index: true },
  observacion: { type: String, trim: true, maxlength: 1000, default: null },
  porcentajePresupuesto: { type: Number, min: 0 },
  reglasBasicasCumplidas: { type: Boolean, default: false },
  cargadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  revisadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", default: null },
  aprobadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", default: null },
  fechaRevision: { type: Date, default: null },
  fechaAprobacion: { type: Date, default: null },
  requiereMesa: { type: Boolean, default: false },
  aprobadoAutomaticamente: { type: Boolean, default: false },
}, { timestamps: true, optimisticConcurrency: true, toJSON: { transform: (_doc, ret) => { if (ret.comprobante) delete ret.comprobante.contenido; delete ret.__v; return ret; } } });
gastoSchema.index({ proyecto: 1, fecha: -1 });

export const Gasto = model("Gasto", gastoSchema);
export default Gasto;
