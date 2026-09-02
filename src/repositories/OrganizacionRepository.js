const JsonRepository = require("./JsonRepository");

class OrganizacionRepository extends JsonRepository {
  constructor() {
    super("organizaciones.json");
  }
}

module.exports = new OrganizacionRepository();
