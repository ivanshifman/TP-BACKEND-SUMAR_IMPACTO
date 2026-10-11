import mongoose from "mongoose";

const { Schema, model } = mongoose;

const organizacionSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El campo 'nombre' es obligatorio."],
      trim: true,
      minlength: [2, "El campo 'nombre' debe tener al menos 2 caracteres."],
    },
    descripcion: {
      type: String,
      required: [true, "El campo 'descripcion' es obligatorio."],
      trim: true,
      minlength: [10, "El campo 'descripcion' debe tener al menos 10 caracteres."],
    },
  },
  { timestamps: true }
);

export const Organizacion = model("Organizacion", organizacionSchema);
export default Organizacion;
