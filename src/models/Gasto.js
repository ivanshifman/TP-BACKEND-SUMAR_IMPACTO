import mongoose from "mongoose";

const { Schema, model } = mongoose;

const gastoSchema = new Schema(
  {
    proyecto: {
      type: Schema.Types.ObjectId,
      ref: "Proyecto",
      required: [true, "El campo 'proyecto' es obligatorio."],
    },
    monto: {
      type: Number,
      required: [true, "El campo 'monto' es obligatorio."],
      min: [0.01, "El campo 'monto' debe ser un número mayor a cero."],
    },
    descripcion: {
      type: String,
      required: [true, "El campo 'descripcion' es obligatorio."],
      trim: true,
      minlength: [3, "El campo 'descripcion' debe tener al menos 3 caracteres."],
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Gasto = model("Gasto", gastoSchema);
export default Gasto;
