const JsonRepository = require("./JsonRepository");

class ProyectoRepository extends JsonRepository {
  constructor() {
    super("proyectos.json");
  }

  findByOrganizacion(organizacionId) {
    return this.findAll().filter((p) => p.organizacionId === Number(organizacionId));
  }
}

module.exports = new ProyectoRepository();
