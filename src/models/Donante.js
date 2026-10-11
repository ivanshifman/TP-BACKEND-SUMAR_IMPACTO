import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TIPOS_VALIDOS = ["individual", "corporativo"];

const donanteSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El campo 'nombre' es obligatorio."],
      trim: true,
      minlength: [2, "El campo 'nombre' debe tener al menos 2 caracteres."],
    },
    email: {
      type: String,
      required: [true, "El campo 'email' es obligatorio."],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "El campo 'email' debe tener un formato válido."],
    },
    tipo: {
      type: String,
      required: [true, "El campo 'tipo' es obligatorio."],
      enum: {
        values: TIPOS_VALIDOS,
        message: `El campo 'tipo' debe ser uno de los siguientes valores: ${TIPOS_VALIDOS.join(", ")}.`,
      },
    },
  },
  { timestamps: true }
);

export const Donante = model("Donante", donanteSchema);
export default Donante;
