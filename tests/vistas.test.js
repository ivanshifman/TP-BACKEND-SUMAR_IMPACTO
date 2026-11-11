import { describe, expect, test } from "@jest/globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pug from "pug";
import { puedeRol } from "../src/config/permisos.js";
import { ROLE_LABELS } from "../src/config/security.js";

// Renderiza las vistas con datos de ejemplo para detectar errores de plantilla (variables
// inexistentes, condiciones por rol) sin necesidad de base de datos.
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "views");
const vista = (nombre, locals, rol = "administrador") => pug.renderFile(path.join(raiz, `${nombre}.pug`), {
  titulo: "Prueba",
  usuarioActual: { _id: "u-actual", nombre: "Persona de prueba", rol },
  puede: (grupo) => puedeRol(grupo, rol),
  ...locals,
});

const proyecto = { _id: "p1", nombre: "Proyecto Norte", activo: true, presupuestoTotal: 10000, periodoInicio: new Date("2026-01-01"), periodoFin: new Date("2026-12-31"), rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }] };
const organizacion = { _id: "o1", nombre: "Organización Norte", descripcion: "Descripción de prueba" };
const totales = { totalDonado: 10000, totalGastado: 0, totalComprometido: 0, saldoDisponible: 10000 };
const detalleProyecto = (extra = {}) => ({ proyecto, organizacion, donaciones: [{ _id: "d1", donanteNombre: "Donante de prueba", monto: 500, fecha: new Date(), donante: "x" }], gastos: [], ...totales, ...extra });

describe("inicio", () => {
  const fila = { ...proyecto, organizacionNombre: "Organización Norte", ...totales };

  test("la gestión ve las opciones de ver inactivos y crear, y la insignia de inactivo", () => {
    const html = vista("index", { proyectos: [fila, { ...fila, _id: "p2", nombre: "Archivado", activo: false }], verInactivos: true }, "mesa_coordinadora");
    expect(html).toContain("Todos los proyectos");
    expect(html).toContain("Ocultar inactivos");
    expect(html).toContain("+ Nuevo proyecto");
    expect(html).toContain("Inactivo");
  });

  test("un referente no ve acciones de gestión", () => {
    const html = vista("index", { proyectos: [fila], verInactivos: false }, "referente_territorial");
    expect(html).toContain("Proyectos activos");
    expect(html).not.toContain("Nuevo proyecto");
    expect(html).not.toContain("Ver inactivos");
  });
});

describe("detalle de proyecto", () => {
  test("el administrador ve donaciones, estado y eliminación con confirmación sin script en línea", () => {
    const html = vista("proyectos/detalle", detalleProyecto(), "administrador");
    expect(html).toContain("Donante de prueba");
    expect(html).toContain("Desactivar");
    expect(html).toContain('data-confirm="¿Eliminar este proyecto?"');
    expect(html).toContain('data-confirm="¿Eliminar esta donación?"');
    expect(html).not.toMatch(/\sonsubmit=/);
  });

  test("Administración gestiona donaciones pero no puede eliminarlas ni administrar el proyecto", () => {
    const html = vista("proyectos/detalle", detalleProyecto(), "administracion");
    expect(html).toContain("Donante de prueba");
    expect(html).toContain("/donaciones/d1/editar");
    expect(html).not.toContain("¿Eliminar esta donación?");
    expect(html).not.toContain("Desactivar");
  });

  test("un referente no recibe la sección de donaciones y ve el botón de cargar comprobantes", () => {
    const html = vista("proyectos/detalle", detalleProyecto({ donaciones: [] }), "referente_territorial");
    expect(html).not.toContain("Donaciones recibidas");
    expect(html).not.toContain("Donante de prueba");
    expect(html).toContain("/gastos/nuevo");
  });

  test("un proyecto inactivo muestra el aviso y ofrece activarlo", () => {
    const html = vista("proyectos/detalle", detalleProyecto({ proyecto: { ...proyecto, activo: false } }), "mesa_coordinadora");
    expect(html).toContain("Este proyecto está inactivo");
    expect(html).toContain("Activar");
  });
});

describe("donantes y organizaciones", () => {
  const donante = { _id: "dn1", nombre: "Donante de prueba", email: "d@x.test", tipo: "individual" };

  test("el detalle del donante ya no muestra la columna «Utilizada» y limita la baja al administrador", () => {
    const donaciones = [{ _id: "d1", proyectoNombre: "Proyecto Norte", monto: 500, fecha: new Date() }];
    const comoAdministracion = vista("donantes/detalle", { donante, donaciones, totalDonado: 500 }, "administracion");
    expect(comoAdministracion).not.toContain("Utilizada");
    expect(comoAdministracion).toContain("Editar");
    expect(comoAdministracion).not.toContain("¿Eliminar este donante?");
    const comoAdmin = vista("donantes/detalle", { donante, donaciones, totalDonado: 500 }, "administrador");
    expect(comoAdmin).toContain('data-confirm="¿Eliminar este donante?"');
  });

  test("la lista de donantes se muestra a la lectura financiera", () => {
    const html = vista("donantes/lista", { donantes: [{ ...donante, cantidadDonaciones: 2, totalDonado: 700 }] }, "auditoria");
    expect(html).toContain("Donante de prueba");
    expect(html).not.toContain("+ Nuevo donante");
  });

  test("organizaciones: Trabajo Social edita pero no elimina", () => {
    const html = vista("organizaciones/detalle", { organizacion, proyectos: [{ ...proyecto, saldoDisponible: 100 }] }, "trabajo_social");
    expect(html).toContain("Editar");
    expect(html).not.toContain("¿Eliminar esta organización?");
    expect(vista("organizaciones/detalle", { organizacion, proyectos: [] }, "administrador")).toContain('data-confirm="¿Eliminar esta organización?"');
  });

  test("la lista de organizaciones se renderiza", () => {
    expect(vista("organizaciones/lista", { organizaciones: [{ ...organizacion, cantidadProyectos: 3 }] }, "mesa_coordinadora")).toContain("Organización Norte");
  });
});

describe("administración", () => {
  const usuarios = [
    { _id: "u-actual", nombre: "Yo", email: "yo@x.test", rol: "administrador", activo: true, organizacion: null, debeCambiarPassword: false },
    { _id: "u2", nombre: "Ana", email: "ana@x.test", rol: "referente_territorial", activo: true, organizacion: { nombre: "Organización Norte" }, debeCambiarPassword: true },
  ];

  test("la lista de usuarios ofrece editar, marca el cambio pendiente y no permite desactivarse a sí mismo", () => {
    const html = vista("admin/usuarios", { usuarios, organizaciones: [organizacion], roles: ROLE_LABELS });
    expect(html).toContain("/admin/usuarios/u2/editar");
    expect(html).toContain("Debe cambiar contraseña");
    expect(html).not.toContain("/admin/usuarios/u-actual/estado");
    expect(html).toContain("/admin/usuarios/u2/estado");
  });

  test("la edición de usuario muestra el restablecimiento solo sobre cuentas ajenas", () => {
    const ajeno = { ...usuarios[1], _id: "u2", organizacion: "o1" };
    const html = vista("admin/usuario-editar", { usuario: ajeno, organizaciones: [organizacion], roles: ROLE_LABELS });
    expect(html).toContain("Restablecer contraseña");
    expect(html).toContain("selected");
    const propio = vista("admin/usuario-editar", { usuario: { ...usuarios[0], organizacion: null }, organizaciones: [organizacion], roles: ROLE_LABELS });
    expect(propio).not.toContain("Restablecer contraseña");
  });

  test("el formulario de cambio de contraseña distingue el cambio obligatorio", () => {
    expect(vista("auth/password", { forzado: true })).toContain("contraseña propia");
    expect(vista("auth/password", { forzado: false })).not.toContain("contraseña propia");
  });

  test("la bitácora pagina y conserva los filtros en los enlaces", () => {
    const html = vista("admin/auditoria", {
      datos: [{ fecha: new Date(), email: "a@x.test", rol: "administrador", metodo: "POST", ruta: "/api/donaciones", estado: 201, resultado: "ok", ip: "10.0.0.1" }],
      total: 120, pagina: 2, limite: 50, paginas: 3, filtros: { metodo: "POST", resultado: "", email: "a@x.test" },
    });
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain("metodo=POST");
    expect(html).toContain("pagina=1");
    expect(html).toContain("pagina=3");
  });

  test("las campañas ocultan la creación a quien no puede gestionarlas", () => {
    const campanias = [{ _id: "c1", nombre: "Campaña", meta: 1000, fechaInicio: new Date(), fechaFin: new Date(), activa: true }];
    expect(vista("admin/campanias", { campanias }, "administracion")).not.toContain("+ Nueva campaña");
    expect(vista("admin/campanias", { campanias }, "mesa_coordinadora")).toContain("+ Nueva campaña");
  });

  test("la guía de uso describe la gestión de usuarios a cargo del administrador y la bitácora", () => {
    const html = vista("tutorial", {});
    expect(html).toContain("El Administrador del sistema gestiona usuarios");
    expect(html).toContain("Bitácora de auditoría");
    expect(html).toContain("Mi contraseña");
  });
});
