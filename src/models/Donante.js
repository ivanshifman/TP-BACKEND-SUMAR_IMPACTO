const ApiError = require("../utils/ApiError");

const TIPOS_VALIDOS = ["individual", "corporativo"];

class Donante {
  constructor({ nombre, email, tipo }) {
    this.nombre = nombre;
    this.email = email;
    this.tipo = tipo;
    this._validar();
  }

  _validar() {
    if (!this.nombre || typeof this.nombre !== "string" || this.nombre.trim() === "") {
      throw ApiError.badRequest("El campo 'nombre' es obligatorio y debe ser un texto.");
    }
    if (!this.email || typeof this.email !== "string" || !this.email.includes("@")) {
      throw ApiError.badRequest("El campo 'email' es obligatorio y debe ser un email válido.");
    }
    if (!this.tipo || !TIPOS_VALIDOS.includes(this.tipo)) {
      throw ApiError.badRequest(`El campo 'tipo' debe ser uno de los siguientes valores: ${TIPOS_VALIDOS.join(", ")}.`);
    }
  }
}

module.exports = Donante;
