const fs = require("fs");
const path = require("path");

class JsonRepository {
  /**
   * @param {string} fileName - Nombre del archivo JSON dentro de la carpeta /data.
   */
  constructor(fileName) {
    this.filePath = path.join(__dirname, "..", "..", "data", fileName);
  }

  _readAll() {
    const contenido = fs.readFileSync(this.filePath, "utf-8");
    return contenido.trim() === "" ? [] : JSON.parse(contenido);
  }

  _writeAll(registros) {
    fs.writeFileSync(this.filePath, JSON.stringify(registros, null, 2), "utf-8");
  }

  _nextId(registros) {
    if (registros.length === 0) return 1;
    return Math.max(...registros.map((r) => r.id)) + 1;
  }

  findAll() {
    return this._readAll();
  }

  findById(id) {
    return this._readAll().find((r) => r.id === Number(id)) || null;
  }

  create(datos) {
    const registros = this._readAll();
    const nuevoRegistro = { id: this._nextId(registros), ...datos };
    registros.push(nuevoRegistro);
    this._writeAll(registros);
    return nuevoRegistro;
  }

  update(id, datos) {
    const registros = this._readAll();
    const indice = registros.findIndex((r) => r.id === Number(id));
    if (indice === -1) return null;
    registros[indice] = { ...registros[indice], ...datos, id: Number(id) };
    this._writeAll(registros);
    return registros[indice];
  }

  delete(id) {
    const registros = this._readAll();
    const indice = registros.findIndex((r) => r.id === Number(id));
    if (indice === -1) return false;
    registros.splice(indice, 1);
    this._writeAll(registros);
    return true;
  }
}

module.exports = JsonRepository;
