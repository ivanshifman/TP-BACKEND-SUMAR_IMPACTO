const ApiError = require("../utils/ApiError");

class Donacion {
  constructor({ donanteId, proyectoId, monto, fecha }) {
    this.donanteId = donanteId;
    this.proyectoId = proyectoId ?? null;
    this.monto = monto;
    this.fecha = fecha || new Date().toISOString().slice(0, 10);
    this.utilizada = false;
    this._validar();
  }

  _validar() {
    if (this.donanteId === undefined || this.donanteId === null || isNaN(Number(this.donanteId))) {
      throw ApiError.badRequest("El campo 'donanteId' es obligatorio y debe ser numérico.");
    }
    this.donanteId = Number(this.donanteId);

    if (this.proyectoId !== null) {
      if (isNaN(Number(this.proyectoId))) {
        throw ApiError.badRequest("El campo 'proyectoId', si se envía, debe ser numérico.");
      }
      this.proyectoId = Number(this.proyectoId);
    }

    if (this.monto === undefined || this.monto === null || isNaN(Number(this.monto)) || Number(this.monto) <= 0) {
      throw ApiError.badRequest("El campo 'monto' es obligatorio y debe ser un número mayor a cero.");
    }
    this.monto = Number(this.monto);
  }
}

module.exports = Donacion;
