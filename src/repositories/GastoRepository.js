const JsonRepository = require("./JsonRepository");

class GastoRepository extends JsonRepository {
  constructor() {
    super("gastos.json");
  }

  findByProyecto(proyectoId) {
    return this.findAll().filter((g) => g.proyectoId === Number(proyectoId));
  }
}

module.exports = new GastoRepository();
