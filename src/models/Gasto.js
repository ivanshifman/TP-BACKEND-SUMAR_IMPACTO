const ApiError = require("../utils/ApiError");

class Gasto {
  constructor({ proyectoId, monto, descripcion, fecha }) {
    this.proyectoId = proyectoId;
    this.monto = monto;
    this.descripcion = descripcion;
    this.fecha = fecha || new Date().toISOString().slice(0, 10);
    this._validar();
  }

  _validar() {
    if (this.proyectoId === undefined || this.proyectoId === null || isNaN(Number(this.proyectoId))) {
      throw ApiError.badRequest("El campo 'proyectoId' es obligatorio y debe ser numérico.");
    }
    this.proyectoId = Number(this.proyectoId);

    if (this.monto === undefined || this.monto === null || isNaN(Number(this.monto)) || Number(this.monto) <= 0) {
      throw ApiError.badRequest("El campo 'monto' es obligatorio y debe ser un número mayor a cero.");
    }
    this.monto = Number(this.monto);

    if (!this.descripcion || typeof this.descripcion !== "string" || this.descripcion.trim() === "") {
      throw ApiError.badRequest("El campo 'descripcion' es obligatorio y debe ser un texto.");
    }
  }
}

module.exports = Gasto;
