import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ROLES_VALIDOS = ["auditoria", "mesa_coordinadora", "trabajo_social", "administracion"];

/**
 * Esquema de Usuario.
 *
 * IMPORTANTE - ALCANCE DE ESTA ENTREGA:
 * Este modelo existe únicamente para dejar preparada la estructura de datos
 * de cara a una futura instancia del trabajo cuatrimestral, donde se
 * incorporará autenticación real (JWT, cookies de sesión, hash de
 * contraseñas con bcrypt, middleware de autorización por rol, etc.).
 *
 * En esta Segunda Entrega el modelo NO se usa: no hay rutas, controladores
 * ni vistas que lo expongan, no hay login, y el campo "password" se guarda
 * sin encriptar a propósito, como simulación. Implementar esa lógica ahora
 * excedería el alcance definido por la cátedra para esta instancia, que
 * explícitamente reserva las arquitecturas de autenticación para una etapa
 * posterior del cuatrimestre.
 */
const usuarioSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El campo 'nombre' es obligatorio."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El campo 'email' es obligatorio."],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "El campo 'email' debe tener un formato válido."],
    },
    // Simulación sin encriptar: en la entrega donde se implemente autenticación
    // real, este campo pasará a guardarse como hash (por ejemplo con bcrypt).
    password: {
      type: String,
      required: [true, "El campo 'password' es obligatorio."],
      minlength: [6, "El campo 'password' debe tener al menos 6 caracteres."],
    },
    rol: {
      type: String,
      required: [true, "El campo 'rol' es obligatorio."],
      enum: {
        values: ROLES_VALIDOS,
        message: `El campo 'rol' debe ser uno de los siguientes valores: ${ROLES_VALIDOS.join(", ")}.`,
      },
    },
  },
  { timestamps: true }
);

export const Usuario = model("Usuario", usuarioSchema);
export default Usuario;
