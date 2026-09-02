const JsonRepository = require("./JsonRepository");

class DonanteRepository extends JsonRepository {
  constructor() {
    super("donantes.json");
  }
}

module.exports = new DonanteRepository();
