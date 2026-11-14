import { describe, expect, test, jest } from "@jest/globals";
import { notFound } from "../src/middleware/notFound.js";

describe("notFound", () => {
  test("pasa al manejador de errores el método y la ruta solicitados", () => {
    const next = jest.fn();

    notFound({ method: "GET", originalUrl: "/ruta-inexistente?pagina=2" }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "La ruta GET /ruta-inexistente?pagina=2 no existe.",
    }));
  });
});
