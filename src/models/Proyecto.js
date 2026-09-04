const ApiError = require("../utils/ApiError");

class Proyecto {
  constructor({ nombre, organizacionId, montoObjetivo }) {
    this.nombre = nombre;
    this.organizacionId = organizacionId;
    this.montoObjetivo = montoObjetivo;
    this._validar();
  }

  _validar() {
    if (!this.nombre || typeof this.nombre !== "string" || this.nombre.trim() === "") {
      throw ApiError.badRequest("El campo 'nombre' es obligatorio y debe ser un texto.");
    }
    if (this.organizacionId === undefined || this.organizacionId === null || Number.isNaN(Number(this.organizacionId))) {
      throw ApiError.badRequest("El campo 'organizacionId' es obligatorio y debe ser numérico.");
    }
    this.organizacionId = Number(this.organizacionId);

    if (this.montoObjetivo !== undefined && this.montoObjetivo !== null) {
      if (Number.isNaN(Number(this.montoObjetivo)) || Number(this.montoObjetivo) <= 0) {
        throw ApiError.badRequest("El campo 'montoObjetivo', si se envía, debe ser un número mayor a cero.");
      }
      this.montoObjetivo = Number(this.montoObjetivo);
    }
  }
}

module.exports = Proyecto;
