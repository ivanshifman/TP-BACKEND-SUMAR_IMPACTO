import mongoose from "mongoose";

const { Schema, model } = mongoose;

const donacionSchema = new Schema(
  {
    donante: {
      type: Schema.Types.ObjectId,
      ref: "Donante",
      required: [true, "El campo 'donante' es obligatorio."],
    },
    proyecto: {
      type: Schema.Types.ObjectId,
      ref: "Proyecto",
      default: null,
    },
    monto: {
      type: Number,
      required: [true, "El campo 'monto' es obligatorio."],
      min: [0.01, "El campo 'monto' debe ser un número mayor a cero."],
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    utilizada: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Donacion = model("Donacion", donacionSchema);
export default Donacion;
