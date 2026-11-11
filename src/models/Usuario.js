import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLE_VALUES } from "../config/security.js";

const { Schema, model } = mongoose;
const usuarioSchema = new Schema({
  nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true, minlength: 12, select: false },
  rol: { type: String, required: true, enum: ROLE_VALUES },
  organizacion: { type: Schema.Types.ObjectId, ref: "Organizacion", default: null },
  activo: { type: Boolean, default: true },
  debeCambiarPassword: { type: Boolean, default: false },
  refreshTokenHash: { type: String, select: false, default: null },
  ultimoAcceso: { type: Date, default: null },
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.password; delete ret.refreshTokenHash; delete ret.__v; return ret; } } });

usuarioSchema.pre("save", async function () {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});
usuarioSchema.methods.compararPassword = function (password) { return bcrypt.compare(password, this.password); };
export const Usuario = model("Usuario", usuarioSchema);
export default Usuario;
