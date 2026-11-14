import { afterEach, describe, expect, jest, test } from "@jest/globals";
import Proyecto from "../src/models/Proyecto.js";
import proyectoService from "../src/services/ProyectoService.js";
import { inicio } from "../src/controllers/viewsController.js";
import { ROLES } from "../src/config/security.js";

afterEach(() => jest.restoreAllMocks());

function invocar(controlador, req, puede) {
  return new Promise((resolve, reject) => {
    const res = {
      locals: { puede },
      render: (vista, datos) => resolve({ vista, datos }),
    };
    controlador(req, res, reject);
  });
}

describe("viewsController.inicio", () => {
  test("filtra por organización y estado según rol y permisos", async () => {
    const proyectos = [
      {
        _id: "p1",
        organizacion: null,
        toObject: () => ({ _id: "p1", nombre: "Proyecto sin organización" }),
      },
      {
        _id: "p2",
        organizacion: { nombre: "Organización Norte" },
        toObject: () => ({ _id: "p2", nombre: "Proyecto Norte" }),
      },
    ];
    const consulta = {
      populate: jest.fn(() => consulta),
      sort: jest.fn(() => Promise.resolve(proyectos)),
    };
    const find = jest.spyOn(Proyecto, "find").mockReturnValue(consulta);
    jest.spyOn(proyectoService, "calcularSaldos").mockResolvedValue(new Map([
      ["p1", { totalDonado: 10, totalGastado: 2, totalComprometido: 3, saldoDisponible: 7 }],
      ["p2", { totalDonado: 20, totalGastado: 4, totalComprometido: 5, saldoDisponible: 15 }],
    ]));
    const puede = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);

    const admin = await invocar(inicio, { user: { rol: ROLES.ADMIN }, query: { inactivos: "1" } }, puede);
    const referente = await invocar(inicio, {
      user: { rol: ROLES.REFERENTE, organizacion: "o1" },
      query: { inactivos: "1" },
    }, puede);

    expect(find).toHaveBeenNthCalledWith(1, {});
    expect(find).toHaveBeenNthCalledWith(2, { organizacion: "o1", activo: { $ne: false } });
    expect(admin.vista).toBe("index");
    expect(admin.datos.proyectos[0]).toMatchObject({
      organizacionNombre: "Organización no encontrada",
      totalDonado: 10,
      saldoDisponible: 7,
    });
    expect(admin.datos.verInactivos).toBe(true);
    expect(referente.datos.verInactivos).toBe(false);
    expect(puede).toHaveBeenCalledWith("GESTION_PROYECTOS");
  });
});
