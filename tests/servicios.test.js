import { afterAll, beforeEach, describe, expect, test } from "@jest/globals";
import bcrypt from "bcryptjs";
import Usuario from "../src/models/Usuario.js";
import Organizacion from "../src/models/Organizacion.js";
import Proyecto from "../src/models/Proyecto.js";
import Donacion from "../src/models/Donacion.js";
import Donante from "../src/models/Donante.js";
import Campania from "../src/models/Campania.js";
import Gasto from "../src/models/Gasto.js";
import usuarioService from "../src/services/UsuarioService.js";
import donacionService from "../src/services/DonacionService.js";
import proyectoService from "../src/services/ProyectoService.js";

// Pruebas de las reglas de negocio de los servicios con los modelos sustituidos por stubs:
// no requieren base de datos. La integración con MongoDB se cubre en integration*.test.js.

const ID = (n) => `64b0c0ffee00000000000${String(n).padStart(3, "0")}`;
const originales = new Map();
const stub = (objeto, nombre, valor) => {
  if (!originales.has(objeto)) originales.set(objeto, {});
  const guardados = originales.get(objeto);
  if (!(nombre in guardados)) guardados[nombre] = objeto[nombre];
  objeto[nombre] = valor;
};
const restaurar = () => { for (const [objeto, guardados] of originales) Object.assign(objeto, guardados); originales.clear(); };
const conSelect = (valor) => Object.assign(Promise.resolve(valor), { select: async () => valor });

const documento = (propiedades) => {
  const doc = { guardados: 0, ...propiedades, set(cambios) { Object.assign(this, cambios); }, async save() { this.guardados += 1; return this; } };
  return doc;
};

afterAll(restaurar);

describe("UsuarioService", () => {
  beforeEach(restaurar);

  test("crea usuarios con email normalizado, sin organización salvo referentes y con cambio de contraseña pendiente", async () => {
    let creado;
    stub(Usuario, "create", async (datos) => { creado = datos; return datos; });
    await usuarioService.crear({ nombre: "Ana", email: " Ana.Perez@Gmail.COM ", password: "Temporal-Clave-2026!", rol: "auditoria", organizacion: ID(1) });
    expect(creado).toMatchObject({ email: "ana.perez@gmail.com", rol: "auditoria", organizacion: null, debeCambiarPassword: true });
  });

  test("rechaza contraseñas débiles, roles inválidos y referentes sin organización", async () => {
    stub(Organizacion, "exists", async () => true);
    await expect(usuarioService.crear({ nombre: "A", email: "a@x.test", password: "debil", rol: "auditoria" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(usuarioService.crear({ nombre: "A", email: "a@x.test", password: "Temporal-Clave-2026!", rol: "inventado" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(usuarioService.crear({ nombre: "A", email: "a@x.test", password: "Temporal-Clave-2026!", rol: "referente_territorial" })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("rechaza una organización inexistente", async () => {
    stub(Organizacion, "exists", async () => false);
    await expect(usuarioService.crear({ nombre: "A", email: "a@x.test", password: "Temporal-Clave-2026!", rol: "referente_territorial", organizacion: ID(1) })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("no permite cambiarse el propio rol ni desactivarse a sí mismo", async () => {
    const yo = documento({ _id: ID(1), rol: "administrador", activo: true, organizacion: null });
    stub(Usuario, "findById", () => conSelect(yo));
    await expect(usuarioService.actualizar(ID(1), { nombre: "Yo", rol: "auditoria", organizacion: null }, { _id: ID(1) })).rejects.toMatchObject({ statusCode: 409 });
    await expect(usuarioService.cambiarEstado(ID(1), { _id: ID(1) })).rejects.toMatchObject({ statusCode: 409 });
  });

  test("un cambio de rol u organización cierra las sesiones; editar solo el nombre no", async () => {
    const otro = documento({ _id: ID(2), nombre: "Beto", rol: "auditoria", activo: true, organizacion: null, refreshTokenHash: "hash" });
    stub(Usuario, "findById", () => conSelect(otro));
    stub(Organizacion, "exists", async () => true);

    await usuarioService.actualizar(ID(2), { nombre: "Beto Gómez", rol: "auditoria", organizacion: null }, { _id: ID(1) });
    expect(otro.refreshTokenHash).toBe("hash");

    await usuarioService.actualizar(ID(2), { nombre: "Beto Gómez", rol: "referente_territorial", organizacion: ID(9) }, { _id: ID(1) });
    expect(otro).toMatchObject({ rol: "referente_territorial", organizacion: ID(9), refreshTokenHash: null });
  });

  test("al desactivar o activar cuenta ajena alterna el estado y cierra sus sesiones", async () => {
    const otro = documento({ _id: ID(2), rol: "auditoria", activo: true, refreshTokenHash: "hash" });
    stub(Usuario, "findById", () => conSelect(otro));
    await usuarioService.cambiarEstado(ID(2), { _id: ID(1) });
    expect(otro).toMatchObject({ activo: false, refreshTokenHash: null });
    await usuarioService.cambiarEstado(ID(2), { _id: ID(1) });
    expect(otro.activo).toBe(true);
  });

  test("no deja al sistema sin administrador activo", async () => {
    const ultimo = documento({ _id: ID(2), rol: "administrador", activo: true });
    stub(Usuario, "findById", () => conSelect(ultimo));
    stub(Usuario, "countDocuments", async () => 0);
    await expect(usuarioService.cambiarEstado(ID(2), { _id: ID(1) })).rejects.toMatchObject({ statusCode: 409 });
    await expect(usuarioService.actualizar(ID(2), { nombre: "X", rol: "auditoria", organizacion: null }, { _id: ID(1) })).rejects.toMatchObject({ statusCode: 409 });
  });

  describe("cambio de contraseña propia", () => {
    const actual = "Temporal-Clave-2026!";
    const crearUsuario = () => documento({ _id: ID(3), email: "ana.perez@gmail.com", password: bcrypt.hashSync(actual, 4), debeCambiarPassword: true });

    test("exige la contraseña actual correcta", async () => {
      stub(Usuario, "findById", () => conSelect(crearUsuario()));
      await expect(usuarioService.cambiarPasswordPropia(ID(3), { passwordActual: "Otra-Clave-2026!", passwordNueva: "Nueva-Clave-2026!" })).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rechaza una nueva contraseña débil, igual a la actual o con el nombre de usuario", async () => {
      stub(Usuario, "findById", () => conSelect(crearUsuario()));
      for (const nueva of ["debil", actual, "Ana.Perez-2026!"]) {
        await expect(usuarioService.cambiarPasswordPropia(ID(3), { passwordActual: actual, passwordNueva: nueva })).rejects.toMatchObject({ statusCode: 400 });
      }
    });

    test("actualiza la contraseña y levanta la obligación de cambiarla", async () => {
      const usuario = crearUsuario();
      stub(Usuario, "findById", () => conSelect(usuario));
      await usuarioService.cambiarPasswordPropia(ID(3), { passwordActual: actual, passwordNueva: "Nueva-Clave-2026!" });
      expect(usuario).toMatchObject({ password: "Nueva-Clave-2026!", debeCambiarPassword: false, guardados: 1 });
    });
  });

  describe("restablecimiento por un administrador", () => {
    test("no puede aplicarse a la propia cuenta", async () => {
      await expect(usuarioService.resetearPassword(ID(1), "Temporal-Clave-2026!", { _id: ID(1) })).rejects.toMatchObject({ statusCode: 409 });
    });

    test("fija la contraseña, obliga a cambiarla y cierra las sesiones", async () => {
      const otro = documento({ _id: ID(2), email: "otro@x.test", refreshTokenHash: "hash", debeCambiarPassword: false });
      stub(Usuario, "findById", () => conSelect(otro));
      await usuarioService.resetearPassword(ID(2), "Temporal-Clave-2026!", { _id: ID(1) });
      expect(otro).toMatchObject({ password: "Temporal-Clave-2026!", debeCambiarPassword: true, refreshTokenHash: null });
    });

    test("valida la política también al restablecer", async () => {
      stub(Usuario, "findById", () => conSelect(documento({ _id: ID(2), email: "otro@x.test" })));
      await expect(usuarioService.resetearPassword(ID(2), "debil", { _id: ID(1) })).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});

describe("DonacionService", () => {
  beforeEach(restaurar);
  const dia = 24 * 60 * 60 * 1000;

  test("valida monto y fecha", () => {
    expect(() => donacionService.validarMontoYFecha({ monto: 100 })).not.toThrow();
    expect(() => donacionService.validarMontoYFecha({ monto: 0 })).toThrow("monto");
    expect(() => donacionService.validarMontoYFecha({ monto: 2_000_000_000 })).toThrow("monto");
    expect(() => donacionService.validarMontoYFecha({ monto: 100, fecha: "no-es-fecha" })).toThrow("no es válida");
    expect(() => donacionService.validarMontoYFecha({ monto: 100, fecha: new Date(Date.now() + 30 * dia).toISOString() })).toThrow("futura");
  });

  test("un proyecto inactivo no recibe donaciones", async () => {
    stub(Proyecto, "findById", async () => ({ activo: false }));
    await expect(donacionService.validarProyectoExisteSiCorresponde(ID(1))).rejects.toMatchObject({ statusCode: 409 });
    stub(Proyecto, "findById", async () => ({ activo: true }));
    await expect(donacionService.validarProyectoExisteSiCorresponde(ID(1))).resolves.toBeUndefined();
    stub(Proyecto, "findById", async () => null);
    await expect(donacionService.validarProyectoExisteSiCorresponde(ID(1))).rejects.toMatchObject({ statusCode: 400 });
  });

  test("sin proyecto ni campaña no hay nada que validar", async () => {
    await expect(donacionService.validarProyectoExisteSiCorresponde(null)).resolves.toBeUndefined();
    await expect(donacionService.validarCampaniaSiCorresponde("", new Date())).resolves.toBeUndefined();
  });

  describe("campañas", () => {
    const campania = (extra) => ({ activa: true, fechaInicio: new Date("2026-11-01T00:00:00Z"), fechaFin: new Date("2026-11-30T00:00:00Z"), ...extra });

    test("rechaza campañas inexistentes o finalizadas", async () => {
      stub(Campania, "findById", async () => null);
      await expect(donacionService.validarCampaniaSiCorresponde(ID(1), new Date("2026-11-10"))).rejects.toMatchObject({ statusCode: 400 });
      stub(Campania, "findById", async () => campania({ activa: false }));
      await expect(donacionService.validarCampaniaSiCorresponde(ID(1), new Date("2026-11-10"))).rejects.toMatchObject({ statusCode: 409 });
    });

    test("exige que la fecha caiga dentro del período, incluyendo el último día completo", async () => {
      stub(Campania, "findById", async () => campania());
      await expect(donacionService.validarCampaniaSiCorresponde(ID(1), new Date("2026-10-31T23:00:00Z"))).rejects.toMatchObject({ statusCode: 400 });
      await expect(donacionService.validarCampaniaSiCorresponde(ID(1), new Date("2026-12-01T01:00:00Z"))).rejects.toMatchObject({ statusCode: 400 });
      await expect(donacionService.validarCampaniaSiCorresponde(ID(1), new Date("2026-11-30T18:00:00Z"))).resolves.toBeUndefined();
      await expect(donacionService.validarCampaniaSiCorresponde(ID(1), new Date("2026-11-01T00:00:00Z"))).resolves.toBeUndefined();
    });
  });

  test("una donación de un proyecto con rendiciones no puede modificarse ni eliminarse", async () => {
    stub(Donacion, "findById", async () => ({ _id: ID(5), proyecto: ID(1) }));
    stub(Gasto, "exists", async () => ({ _id: ID(6) }));
    await expect(donacionService.obtenerModificableOFallar(ID(5))).rejects.toMatchObject({ statusCode: 409 });
    stub(Gasto, "exists", async () => null);
    await expect(donacionService.obtenerModificableOFallar(ID(5))).resolves.toMatchObject({ _id: ID(5) });
  });

  test("crea la donación solo si todas las validaciones pasan y solo con campos permitidos", async () => {
    let creada;
    stub(Donante, "findById", async () => ({ _id: ID(2) }));
    stub(Proyecto, "findById", async () => ({ activo: true }));
    stub(Donacion, "create", async (datos) => { creada = datos; return datos; });
    await donacionService.crear({ donante: ID(2), proyecto: ID(1), campania: "", monto: 500, fecha: "", utilizada: true, extra: "no" });
    expect(creada).toEqual({ donante: ID(2), proyecto: ID(1), campania: null, monto: 500, fecha: undefined });
  });
});

describe("ProyectoService", () => {
  beforeEach(restaurar);

  test("un referente solo opera sobre proyectos de su organización", () => {
    const proyecto = { organizacion: ID(10) };
    expect(() => proyectoService.validarAcceso(proyecto, { rol: "referente_territorial", organizacion: ID(11) })).toThrow();
    expect(() => proyectoService.validarAcceso(proyecto, { rol: "referente_territorial", organizacion: ID(10) })).not.toThrow();
    expect(() => proyectoService.validarAcceso(proyecto, { rol: "auditoria", organizacion: null })).not.toThrow();
    expect(() => proyectoService.validarAcceso(proyecto, undefined)).not.toThrow();
  });

  test("calcula los saldos de varios proyectos con consultas agrupadas", async () => {
    const consultas = [];
    stub(Donacion, "aggregate", async (pipeline) => { consultas.push(["donaciones", pipeline]); return [{ _id: ID(1), total: 1000 }]; });
    stub(Gasto, "aggregate", async (pipeline) => {
      consultas.push(["gastos", pipeline]);
      const filtro = pipeline[0].$match;
      return filtro.$or ? [{ _id: ID(1), total: 100 }] : [{ _id: ID(1), total: 300 }];
    });

    const saldos = await proyectoService.calcularSaldos([ID(1), ID(2)]);
    expect(saldos.get(ID(1))).toEqual({ proyectoId: ID(1), totalDonado: 1000, totalGastado: 100, totalComprometido: 300, saldoDisponible: 700 });
    expect(saldos.get(ID(2))).toEqual({ proyectoId: ID(2), totalDonado: 0, totalGastado: 0, totalComprometido: 0, saldoDisponible: 0 });
    expect(consultas).toHaveLength(3);
    expect(consultas[2][1][0].$match.estado).toEqual({ $ne: "observado" });
  });

  test("no elimina proyectos con movimientos, pero sí los desactiva", async () => {
    const proyecto = documento({ _id: ID(1), activo: true });
    stub(Proyecto, "findById", async () => proyecto);
    stub(Donacion, "exists", async () => ({ _id: ID(9) }));
    stub(Gasto, "exists", async () => null);
    await expect(proyectoService.eliminar(ID(1))).rejects.toMatchObject({ statusCode: 409 });
    await proyectoService.cambiarActivo(ID(1), false);
    expect(proyecto).toMatchObject({ activo: false, guardados: 1 });
  });

  describe("modificación del presupuesto", () => {
    const proyecto = () => documento({ _id: ID(1), presupuestoTotal: 10000, rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }] });
    const datos = (cambios) => ({ nombre: "P", organizacion: ID(10), presupuestoTotal: 10000, periodoInicio: "2026-01-01", periodoFin: "2026-12-31", rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }], ...cambios });

    const prepararRendido = (rendido) => {
      stub(Organizacion, "findById", async () => ({ _id: ID(10) }));
      stub(Gasto, "aggregate", async (pipeline) => (pipeline[1].$group._id.$toLower ? [{ _id: "alimentos", total: rendido }] : [{ _id: ID(1), total: rendido }]));
      stub(Donacion, "aggregate", async () => []);
    };

    test("rechaza bajar el presupuesto por debajo de lo ya comprometido", async () => {
      stub(Proyecto, "findById", async () => proyecto());
      prepararRendido(600);
      await expect(proyectoService.actualizar(ID(1), datos({ presupuestoTotal: 500 }))).rejects.toMatchObject({ statusCode: 409 });
    });

    test("rechaza quitar un rubro con rendiciones", async () => {
      stub(Proyecto, "findById", async () => proyecto());
      prepararRendido(600);
      await expect(proyectoService.actualizar(ID(1), datos({ rubros: [{ nombre: "Otro", montoAprobado: 10000 }] }))).rejects.toMatchObject({ statusCode: 409 });
    });

    test("permite ampliar el presupuesto y guarda solo los campos editables", async () => {
      const guardado = proyecto();
      stub(Proyecto, "findById", async () => guardado);
      prepararRendido(600);
      await proyectoService.actualizar(ID(1), datos({ presupuestoTotal: 20000, rubros: [{ nombre: "Alimentos", montoAprobado: 20000 }], activo: false, _id: "intento" }));
      expect(guardado).toMatchObject({ presupuestoTotal: 20000, guardados: 1 });
      expect(guardado.activo).toBeUndefined();
      expect(guardado._id).toBe(ID(1));
    });
  });
});
