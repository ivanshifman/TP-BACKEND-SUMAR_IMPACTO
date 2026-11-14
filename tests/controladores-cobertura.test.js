import { afterEach, describe, expect, jest, test } from "@jest/globals";
import Donacion from "../src/models/Donacion.js";
import Donante from "../src/models/Donante.js";
import Gasto from "../src/models/Gasto.js";
import Organizacion from "../src/models/Organizacion.js";
import Proyecto from "../src/models/Proyecto.js";
import donacionService from "../src/services/DonacionService.js";
import proyectoService from "../src/services/ProyectoService.js";
import * as donaciones from "../src/controllers/donacionesController.js";
import * as donantes from "../src/controllers/donantesController.js";
import * as gastos from "../src/controllers/gastosController.js";
import * as organizaciones from "../src/controllers/organizacionesController.js";
import { ROLES } from "../src/config/security.js";

afterEach(() => jest.restoreAllMocks());

function invocar(controlador, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ statusCode: this.statusCode, body }); },
      send(body) { resolve({ statusCode: this.statusCode, body }); },
    };
    controlador(req, res, reject);
  });
}

function consultaPoblada(resultado) {
  const consulta = {
    select: jest.fn(() => consulta),
    populate: jest.fn(() => consulta),
    then(resolve, reject) { return Promise.resolve(resultado).then(resolve, reject); },
  };
  return consulta;
}

function consultaOrdenada(resultado) {
  const consulta = {
    select: jest.fn(() => consulta),
    populate: jest.fn(() => consulta),
    sort: jest.fn(() => Promise.resolve(resultado)),
  };
  return consulta;
}

describe("donacionesController", () => {
  test("lista donaciones con y sin filtros", async () => {
    const filas = [{ _id: "d1" }];
    const find = jest.spyOn(Donacion, "find")
      .mockReturnValueOnce(consultaOrdenada(filas))
      .mockReturnValueOnce(consultaOrdenada([]));

    await expect(invocar(donaciones.listar, { query: { donanteId: "dn1", proyectoId: "p1" } }))
      .resolves.toEqual({ statusCode: 200, body: filas });
    await invocar(donaciones.listar, { query: {} });

    expect(find).toHaveBeenNthCalledWith(1, { donante: "dn1", proyecto: "p1" });
    expect(find).toHaveBeenNthCalledWith(2, {});
  });

  test("obtiene una donación o devuelve 404", async () => {
    const donacion = { _id: "d1" };
    jest.spyOn(Donacion, "findById")
      .mockReturnValueOnce(consultaPoblada(donacion))
      .mockReturnValueOnce(consultaPoblada(null));

    await expect(invocar(donaciones.obtenerPorId, { params: { id: "d1" } }))
      .resolves.toEqual({ statusCode: 200, body: donacion });
    await expect(invocar(donaciones.obtenerPorId, { params: { id: "faltante" } }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("crea, actualiza y elimina donaciones delegando campos permitidos", async () => {
    const entrada = { donante: "dn1", proyecto: "p1", campania: "", monto: "250", fecha: "2026-11-14", extra: "ignorar" };
    const permitidos = { donante: "dn1", proyecto: "p1", campania: "", monto: "250", fecha: "2026-11-14" };
    const crear = jest.spyOn(donacionService, "crear").mockResolvedValue({ _id: "d1" });
    const actualizar = jest.spyOn(donacionService, "actualizar").mockResolvedValue({ _id: "d1" });
    const eliminar = jest.spyOn(donacionService, "eliminar").mockResolvedValue(undefined);

    await expect(invocar(donaciones.crear, { body: entrada }))
      .resolves.toEqual({ statusCode: 201, body: { _id: "d1" } });
    await expect(invocar(donaciones.actualizar, { params: { id: "d1" }, body: entrada }))
      .resolves.toEqual({ statusCode: 200, body: { _id: "d1" } });
    await expect(invocar(donaciones.eliminar, { params: { id: "d1" } }))
      .resolves.toEqual({ statusCode: 204, body: undefined });

    expect(crear).toHaveBeenCalledWith(permitidos);
    expect(actualizar).toHaveBeenCalledWith("d1", permitidos);
    expect(eliminar).toHaveBeenCalledWith("d1");
  });
});

describe("donantesController", () => {
  test("lista donantes con y sin filtro por tipo", async () => {
    const filas = [{ _id: "dn1" }];
    const find = jest.spyOn(Donante, "find")
      .mockReturnValueOnce(consultaOrdenada(filas))
      .mockReturnValueOnce(consultaOrdenada([]));

    await expect(invocar(donantes.listar, { query: { tipo: "individual" } }))
      .resolves.toEqual({ statusCode: 200, body: filas });
    await invocar(donantes.listar, { query: {} });

    expect(find).toHaveBeenNthCalledWith(1, { tipo: "individual" });
    expect(find).toHaveBeenNthCalledWith(2, {});
  });

  test("obtiene un donante o devuelve 404", async () => {
    const donante = { _id: "dn1" };
    jest.spyOn(Donante, "findById").mockResolvedValueOnce(donante).mockResolvedValueOnce(null);

    await expect(invocar(donantes.obtenerPorId, { params: { id: "dn1" } }))
      .resolves.toEqual({ statusCode: 200, body: donante });
    await expect(invocar(donantes.obtenerPorId, { params: { id: "faltante" } }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("crea y actualiza donantes; informa cuando no existe al actualizar", async () => {
    const entrada = { nombre: "Ana", email: "ana@example.test", tipo: "individual", extra: "ignorar" };
    const guardados = { nombre: entrada.nombre, email: entrada.email, tipo: entrada.tipo };
    jest.spyOn(Donante, "create").mockResolvedValue({ _id: "dn1", ...guardados });
    const actualizar = jest.spyOn(Donante, "findByIdAndUpdate")
      .mockResolvedValueOnce({ _id: "dn1", ...guardados })
      .mockResolvedValueOnce(null);

    await expect(invocar(donantes.crear, { body: entrada }))
      .resolves.toMatchObject({ statusCode: 201, body: guardados });
    await expect(invocar(donantes.actualizar, { params: { id: "dn1" }, body: entrada }))
      .resolves.toMatchObject({ statusCode: 200, body: guardados });
    await expect(invocar(donantes.actualizar, { params: { id: "faltante" }, body: entrada }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(actualizar).toHaveBeenCalledWith("dn1", guardados, { new: true, runValidators: true, context: "query" });
  });

  test("no elimina donantes con donaciones y distingue registro inexistente", async () => {
    jest.spyOn(Donacion, "exists").mockResolvedValueOnce({ _id: "d1" }).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const eliminar = jest.spyOn(Donante, "findByIdAndDelete").mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: "dn1" });

    await expect(invocar(donantes.eliminar, { params: { id: "dn1" } }))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(invocar(donantes.eliminar, { params: { id: "faltante" } }))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(invocar(donantes.eliminar, { params: { id: "dn1" } }))
      .resolves.toEqual({ statusCode: 204, body: undefined });
    expect(eliminar).toHaveBeenCalledTimes(2);
  });
});

describe("organizacionesController", () => {
  test("lista y obtiene organizaciones", async () => {
    const filas = [{ _id: "o1" }];
    jest.spyOn(Organizacion, "find").mockReturnValue(consultaOrdenada(filas));
    jest.spyOn(Organizacion, "findById").mockResolvedValueOnce(filas[0]).mockResolvedValueOnce(null);

    await expect(invocar(organizaciones.listar, { params: {} }))
      .resolves.toEqual({ statusCode: 200, body: filas });
    await expect(invocar(organizaciones.obtenerPorId, { params: { id: "o1" } }))
      .resolves.toEqual({ statusCode: 200, body: filas[0] });
    await expect(invocar(organizaciones.obtenerPorId, { params: { id: "faltante" } }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("crea y actualiza organizaciones; informa cuando no existe al actualizar", async () => {
    const entrada = { nombre: "Comedor Norte", descripcion: "Organización comunitaria de prueba", extra: "ignorar" };
    const guardadas = { nombre: entrada.nombre, descripcion: entrada.descripcion };
    jest.spyOn(Organizacion, "create").mockResolvedValue({ _id: "o1", ...guardadas });
    const actualizar = jest.spyOn(Organizacion, "findByIdAndUpdate")
      .mockResolvedValueOnce({ _id: "o1", ...guardadas })
      .mockResolvedValueOnce(null);

    await expect(invocar(organizaciones.crear, { body: entrada }))
      .resolves.toMatchObject({ statusCode: 201, body: guardadas });
    await expect(invocar(organizaciones.actualizar, { params: { id: "o1" }, body: entrada }))
      .resolves.toMatchObject({ statusCode: 200, body: guardadas });
    await expect(invocar(organizaciones.actualizar, { params: { id: "faltante" }, body: entrada }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(actualizar).toHaveBeenCalledWith("o1", guardadas, { new: true, runValidators: true, context: "query" });
  });

  test("no elimina organizaciones con proyectos y distingue registro inexistente", async () => {
    jest.spyOn(Proyecto, "exists").mockResolvedValueOnce({ _id: "p1" }).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const eliminar = jest.spyOn(Organizacion, "findByIdAndDelete").mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: "o1" });

    await expect(invocar(organizaciones.eliminar, { params: { id: "o1" } }))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(invocar(organizaciones.eliminar, { params: { id: "faltante" } }))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(invocar(organizaciones.eliminar, { params: { id: "o1" } }))
      .resolves.toEqual({ statusCode: 204, body: undefined });
    expect(eliminar).toHaveBeenCalledTimes(2);
  });
});

describe("gastosController", () => {
  test("lista gastos con filtros para administración y limita los del referente a su organización", async () => {
    const filas = [{ _id: "g1" }];
    const find = jest.spyOn(Gasto, "find")
      .mockReturnValueOnce(consultaOrdenada(filas))
      .mockReturnValueOnce(consultaOrdenada(filas));
    jest.spyOn(proyectoService, "idsDeProyectosDeLaOrganizacion").mockResolvedValue(["p1", "p2"]);

    await expect(invocar(gastos.listar, {
      query: { proyectoId: "p0", estado: "en_revision" },
      user: { rol: ROLES.ADMIN },
    })).resolves.toEqual({ statusCode: 200, body: filas });
    await expect(invocar(gastos.listar, {
      query: { proyectoId: "p0", estado: "en_revision" },
      user: { rol: ROLES.REFERENTE },
    })).resolves.toEqual({ statusCode: 200, body: filas });

    expect(find).toHaveBeenNthCalledWith(1, { proyecto: "p0", estado: "en_revision" });
    expect(find).toHaveBeenNthCalledWith(2, { proyecto: { $in: ["p1", "p2"] }, estado: "en_revision" });
  });

  test("obtiene gastos, aplica acceso del referente y responde por recursos inexistentes", async () => {
    const gasto = { _id: "g1", proyecto: { _id: "p1" } };
    const proyecto = { organizacion: "o1" };
    const find = jest.spyOn(Gasto, "findById")
      .mockReturnValueOnce(consultaPoblada(gasto))
      .mockReturnValueOnce(consultaPoblada(gasto))
      .mockReturnValueOnce(consultaPoblada(gasto))
      .mockReturnValueOnce(consultaPoblada(null));
    jest.spyOn(Proyecto, "findById")
      .mockReturnValueOnce(consultaPoblada(proyecto))
      .mockReturnValueOnce(consultaPoblada(null));
    const validarAcceso = jest.spyOn(proyectoService, "validarAcceso").mockImplementation(() => {});

    await expect(invocar(gastos.obtenerPorId, { params: { id: "g1" }, user: { rol: ROLES.ADMIN } }))
      .resolves.toEqual({ statusCode: 200, body: gasto });
    await expect(invocar(gastos.obtenerPorId, {
      params: { id: "g1" },
      user: { rol: ROLES.REFERENTE, organizacion: "o1" },
    })).resolves.toEqual({ statusCode: 200, body: gasto });
    await expect(invocar(gastos.obtenerPorId, {
      params: { id: "g1" },
      user: { rol: ROLES.REFERENTE, organizacion: "o1" },
    })).rejects.toMatchObject({ statusCode: 403 });
    await expect(invocar(gastos.obtenerPorId, { params: { id: "faltante" }, user: { rol: ROLES.ADMIN } }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(validarAcceso).toHaveBeenCalledWith(proyecto, { rol: ROLES.REFERENTE, organizacion: "o1" });
  });
});
