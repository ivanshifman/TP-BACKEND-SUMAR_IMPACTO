import mongoose from "mongoose";
const { Schema, model } = mongoose;
const campaniaSchema = new Schema({
  nombre: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  descripcion: { type: String, trim: true, maxlength: 1000, default: "" },
  meta: { type: Number, required: true, min: 0.01 },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  activa: { type: Boolean, default: true },
}, { timestamps: true });
campaniaSchema.pre("validate", function () { if (this.fechaInicio && this.fechaFin && this.fechaFin < this.fechaInicio) this.invalidate("fechaFin", "La fecha de fin debe ser posterior al inicio."); });
export default model("Campania", campaniaSchema);
