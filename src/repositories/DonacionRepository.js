const JsonRepository = require("./JsonRepository");

class DonacionRepository extends JsonRepository {
  constructor() {
    super("donaciones.json");
  }

  findByProyecto(proyectoId) {
    return this.findAll().filter((d) => d.proyectoId === Number(proyectoId));
  }

  findByDonante(donanteId) {
    return this.findAll().filter((d) => d.donanteId === Number(donanteId));
  }
}

module.exports = new DonacionRepository();
