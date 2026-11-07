import mongoose from "mongoose";
const { Schema, model } = mongoose;
const rubroSchema = new Schema({ nombre: { type: String, required: true, trim: true, maxlength: 80 }, montoAprobado: { type: Number, required: true, min: 0.01 } }, { _id: false });
const proyectoSchema = new Schema({
  nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  organizacion: { type: Schema.Types.ObjectId, ref: "Organizacion", required: true, index: true },
  montoObjetivo: { type: Number, min: 0.01 },
  presupuestoTotal: { type: Number, required: true, min: 0.01 },
  periodoInicio: { type: Date, required: true },
  periodoFin: { type: Date, required: true },
  rubros: { type: [rubroSchema], validate: { validator: (v) => v.length > 0, message: "El presupuesto debe contener al menos un rubro." } },
  activo: { type: Boolean, default: true },
}, { timestamps: true });
proyectoSchema.pre("validate", function () {
  if (this.periodoInicio && this.periodoFin && this.periodoFin < this.periodoInicio) this.invalidate("periodoFin", "La fecha de fin debe ser posterior al inicio.");
  if (this.rubros?.length && this.presupuestoTotal != null) {
    const totalRubros = this.rubros.reduce((sum, r) => sum + Number(r.montoAprobado || 0), 0);
    if (totalRubros > this.presupuestoTotal) this.invalidate("rubros", "La suma de rubros no puede superar el presupuesto total.");
  }
});
export const Proyecto = model("Proyecto", proyectoSchema);
export default Proyecto;
