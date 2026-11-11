import bcrypt from "bcryptjs";
import Usuario from "../models/Usuario.js";
import Organizacion from "../models/Organizacion.js";
import ApiError from "../utils/ApiError.js";
import { ROLES, ROLE_VALUES } from "../config/security.js";
import { normalizarEmail } from "../utils/email.js";
import { evaluarPassword } from "../utils/politicaPassword.js";

const mismoId = (a, b) => String(a) === String(b);

class UsuarioService {
  validarPasswordOFallar(password, { email } = {}) {
    const problemas = evaluarPassword(password, { email });
    if (problemas.length) throw ApiError.badRequest(`La contraseña no cumple la política: ${problemas.join(" ")}`);
  }

  async #validarRolYOrganizacion(rol, organizacion) {
    if (!ROLE_VALUES.includes(rol)) throw ApiError.badRequest("El rol seleccionado no es válido.");
    // Solo los referentes tienen organización: para los demás roles se ignora el dato.
    if (rol !== ROLES.REFERENTE) return;
    if (!organizacion) throw ApiError.badRequest("El referente territorial debe estar asociado a una organización.");
    if (!(await Organizacion.exists({ _id: organizacion }))) throw ApiError.badRequest("La organización seleccionada no existe.");
  }

  async #exigirOtroAdministradorActivo(usuario) {
    if (usuario.rol !== ROLES.ADMIN || !usuario.activo) return;
    const otros = await Usuario.countDocuments({ rol: ROLES.ADMIN, activo: true, _id: { $ne: usuario._id } });
    if (otros === 0) throw ApiError.conflict("Debe existir al menos un administrador activo.");
  }

  async obtenerOFallar(id) {
    const usuario = await Usuario.findById(id);
    if (!usuario) throw ApiError.notFound("Usuario inexistente.");
    return usuario;
  }

  async crear({ nombre, email, password, rol, organizacion }) {
    this.validarPasswordOFallar(password, { email });
    await this.#validarRolYOrganizacion(rol, organizacion);
    return Usuario.create({
      nombre,
      email: normalizarEmail(email),
      password,
      rol,
      organizacion: rol === ROLES.REFERENTE ? organizacion : null,
      debeCambiarPassword: true,
    });
  }

  async actualizar(id, { nombre, rol, organizacion }, actor) {
    const usuario = await this.obtenerOFallar(id);
    await this.#validarRolYOrganizacion(rol, organizacion);
    if (mismoId(usuario._id, actor._id) && rol !== usuario.rol) throw ApiError.conflict("No podés cambiar tu propio rol.");
    if (rol !== usuario.rol) await this.#exigirOtroAdministradorActivo(usuario);

    const nuevaOrganizacion = rol === ROLES.REFERENTE ? organizacion : null;
    const cambioPermisos = rol !== usuario.rol || String(nuevaOrganizacion ?? "") !== String(usuario.organizacion ?? "");
    usuario.set({ nombre, rol, organizacion: nuevaOrganizacion });
    if (cambioPermisos) usuario.refreshTokenHash = null;
    await usuario.save();
    return usuario;
  }

  async cambiarEstado(id, actor) {
    if (mismoId(id, actor._id)) throw ApiError.conflict("No podés desactivar tu propio usuario.");
    const usuario = await this.obtenerOFallar(id);
    await this.#exigirOtroAdministradorActivo(usuario);
    usuario.activo = !usuario.activo;
    usuario.refreshTokenHash = null;
    await usuario.save();
    return usuario;
  }

  async cambiarPasswordPropia(id, { passwordActual, passwordNueva }) {
    const usuario = await Usuario.findById(id).select("+password +refreshTokenHash");
    if (!usuario) throw ApiError.notFound("Usuario inexistente.");
    if (!(await bcrypt.compare(String(passwordActual ?? ""), usuario.password))) throw ApiError.badRequest("La contraseña actual no es correcta.");
    this.validarPasswordOFallar(passwordNueva, { email: usuario.email });
    if (await bcrypt.compare(passwordNueva, usuario.password)) throw ApiError.badRequest("La nueva contraseña debe ser distinta de la actual.");
    usuario.password = passwordNueva;
    usuario.debeCambiarPassword = false;
    await usuario.save();
    return usuario;
  }

  async resetearPassword(id, passwordNueva, actor) {
    if (mismoId(id, actor._id)) throw ApiError.conflict("Para cambiar tu propia contraseña usá la opción «Mi contraseña».");
    const usuario = await this.obtenerOFallar(id);
    this.validarPasswordOFallar(passwordNueva, { email: usuario.email });
    usuario.password = passwordNueva;
    usuario.debeCambiarPassword = true;
    usuario.refreshTokenHash = null;
    await usuario.save();
    return usuario;
  }
}

export const usuarioService = new UsuarioService();
export default usuarioService;
