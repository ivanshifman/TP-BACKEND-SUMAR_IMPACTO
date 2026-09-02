const ApiError = require("../utils/ApiError");

class Organizacion {
  constructor({ nombre, descripcion }) {
    this.nombre = nombre;
    this.descripcion = descripcion;
    this._validar();
  }

  _validar() {
    if (!this.nombre || typeof this.nombre !== "string" || this.nombre.trim() === "") {
      throw ApiError.badRequest("El campo 'nombre' es obligatorio y debe ser un texto.");
    }
    if (!this.descripcion || typeof this.descripcion !== "string" || this.descripcion.trim() === "") {
      throw ApiError.badRequest("El campo 'descripcion' es obligatorio y debe ser un texto.");
    }
  }
}

module.exports = Organizacion;
