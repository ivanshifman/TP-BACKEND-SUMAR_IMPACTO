import mongoose from "mongoose";

const { Schema, model } = mongoose;

const proyectoSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El campo 'nombre' es obligatorio."],
      trim: true,
      minlength: [2, "El campo 'nombre' debe tener al menos 2 caracteres."],
    },
    organizacion: {
      type: Schema.Types.ObjectId,
      ref: "Organizacion",
      required: [true, "El campo 'organizacion' es obligatorio."],
    },
    montoObjetivo: {
      type: Number,
      min: [0.01, "El campo 'montoObjetivo', si se envía, debe ser mayor a cero."],
    },
  },
  { timestamps: true }
);

export const Proyecto = model("Proyecto", proyectoSchema);
export default Proyecto;
