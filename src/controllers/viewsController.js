import Proyecto from "../models/Proyecto.js";
import Organizacion from "../models/Organizacion.js";
import Donante from "../models/Donante.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import Campania from "../models/Campania.js";
import proyectoService from "../services/ProyectoService.js";
import donacionService from "../services/DonacionService.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import rendicionService from "../services/RendicionService.js";
import { ROLES } from "../config/security.js";

function normalizarPresupuesto(body) {
  let rubros = body.rubros;
  if (typeof rubros === "string") {
    rubros = rubros.split("\n").map((linea) => linea.trim()).filter(Boolean).map((linea) => {
      const [nombre, monto] = linea.split(":");
      return { nombre: nombre?.trim(), montoAprobado: Number(monto?.trim()) };
    });
  }
  return {
    presupuestoTotal: Number(body.presupuestoTotal),
    periodoInicio: new Date(body.periodoInicio),
    periodoFin: new Date(body.periodoFin),
    rubros,
  };
}

export const inicio = asyncHandler(async (req, res) => {
  const filtro = req.user?.rol === ROLES.REFERENTE ? { organizacion: req.user.organizacion } : {};
  const verInactivos = req.query.inactivos === "1" && res.locals.puede("GESTION_PROYECTOS");
  if (!verInactivos) filtro.activo = { $ne: false };
  const proyectosDb = await Proyecto.find(filtro).populate("organizacion", "nombre").sort({ nombre: 1 });
  const saldos = await proyectoService.calcularSaldos(proyectosDb.map((proyecto) => proyecto._id));

  const proyectos = proyectosDb.map((proyecto) => {
    const { totalDonado, totalGastado, totalComprometido, saldoDisponible } = saldos.get(String(proyecto._id));
    return {
      ...proyecto.toObject(),
      organizacionNombre: proyecto.organizacion ? proyecto.organizacion.nombre : "Organización no encontrada",
      totalDonado,
      totalGastado,
      totalComprometido,
      saldoDisponible,
    };
  });

  res.render("index", { titulo: "SumarImpacto - Proyectos", proyectos, verInactivos });
});

export const detalleProyecto = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  proyectoService.validarAcceso(proyecto, req.user);
  await proyecto.populate("organizacion");

  // Los datos de donantes y donaciones solo se consultan para los roles autorizados a verlos.
  const puedeVerDonaciones = res.locals.puede("LECTURA_FINANCIERA");
  const [donacionesDb, gastos, saldos] = await Promise.all([
    puedeVerDonaciones ? Donacion.find({ proyecto: proyecto._id }).populate("donante", "nombre").sort({ fecha: 1 }) : [],
    Gasto.find({ proyecto: proyecto._id }).select("-comprobante.contenido").populate("cargadoPor", "nombre").sort({ fecha: 1 }),
    proyectoService.calcularSaldos([proyecto._id]),
  ]);
  const { totalDonado, totalGastado, totalComprometido, saldoDisponible } = saldos.get(String(proyecto._id));

  const donaciones = donacionesDb.map((d) => ({
    ...d.toObject(),
    donanteNombre: d.donante ? d.donante.nombre : "Donante no encontrado",
  }));

  res.render("proyectos/detalle", {
    titulo: `SumarImpacto - ${proyecto.nombre}`,
    proyecto,
    organizacion: proyecto.organizacion,
    donaciones,
    gastos,
    totalDonado,
    totalGastado,
    totalComprometido,
    saldoDisponible,
  });
});

export const listarDonantes = asyncHandler(async (req, res) => {
  const [donantesDb, totales] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Donacion.aggregate([{ $group: { _id: "$donante", cantidad: { $sum: 1 }, total: { $sum: "$monto" } } }]),
  ]);
  const totalesPorDonante = new Map(totales.map((fila) => [String(fila._id), fila]));

  const donantes = donantesDb.map((donante) => {
    const fila = totalesPorDonante.get(String(donante._id));
    return { ...donante.toObject(), cantidadDonaciones: fila?.cantidad ?? 0, totalDonado: fila?.total ?? 0 };
  });

  res.render("donantes/lista", { titulo: "SumarImpacto - Donantes", donantes });
});

export const detalleDonante = asyncHandler(async (req, res) => {
  const donante = await Donante.findById(req.params.id);
  if (!donante) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  const donacionesDb = await Donacion.find({ donante: donante._id }).populate("proyecto", "nombre").sort({ fecha: -1 });
  const donaciones = donacionesDb.map((d) => ({
    ...d.toObject(),
    proyectoNombre: d.proyecto ? d.proyecto.nombre : "Sin proyecto asignado",
  }));
  const totalDonado = donaciones.reduce((acc, d) => acc + d.monto, 0);

  res.render("donantes/detalle", {
    titulo: `SumarImpacto - ${donante.nombre}`,
    donante,
    donaciones,
    totalDonado,
  });
});

export const listarOrganizaciones = asyncHandler(async (req, res) => {
  const [organizacionesDb, conteos] = await Promise.all([
    Organizacion.find().sort({ nombre: 1 }),
    Proyecto.aggregate([{ $group: { _id: "$organizacion", cantidad: { $sum: 1 } } }]),
  ]);
  const proyectosPorOrganizacion = new Map(conteos.map((fila) => [String(fila._id), fila.cantidad]));

  const organizaciones = organizacionesDb.map((organizacion) => ({
    ...organizacion.toObject(),
    cantidadProyectos: proyectosPorOrganizacion.get(String(organizacion._id)) ?? 0,
  }));

  res.render("organizaciones/lista", { titulo: "SumarImpacto - Organizaciones", organizaciones });
});

export const detalleOrganizacion = asyncHandler(async (req, res) => {
  const organizacion = await Organizacion.findById(req.params.id);
  if (!organizacion) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  const proyectosDb = await Proyecto.find({ organizacion: organizacion._id }).sort({ nombre: 1 });
  const saldos = await proyectoService.calcularSaldos(proyectosDb.map((proyecto) => proyecto._id));
  const proyectos = proyectosDb.map((proyecto) => ({ ...proyecto.toObject(), saldoDisponible: saldos.get(String(proyecto._id)).saldoDisponible }));

  res.render("organizaciones/detalle", {
    titulo: `SumarImpacto - ${organizacion.nombre}`,
    organizacion,
    proyectos,
  });
});

export const listarGastos = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.user?.rol === ROLES.REFERENTE) filtro.proyecto = { $in: await proyectoService.idsDeProyectosDeLaOrganizacion(req.user) };
  const gastosDb = await Gasto.find(filtro).select("-comprobante.contenido").populate("proyecto", "nombre").sort({ fecha: -1 });
  const gastos = gastosDb.map((g) => ({
    ...g.toObject(),
    proyectoNombre: g.proyecto ? g.proyecto.nombre : "Proyecto no encontrado",
  }));
  res.render("gastos/lista", { titulo: "SumarImpacto - Gastos", gastos });
});

export const mostrarFormularioNuevoProyecto = asyncHandler(async (req, res) => {
  const organizaciones = await Organizacion.find().sort({ nombre: 1 });
  res.render("proyectos/formulario", {
    titulo: "SumarImpacto - Nuevo proyecto",
    modo: "crear",
    proyecto: {},
    organizaciones,
    error: null,
  });
});

const datosDeProyecto = (body) => ({ nombre: body.nombre, organizacion: body.organizacion, montoObjetivo: body.montoObjetivo, ...normalizarPresupuesto(body) });

export const crearProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.crear(datosDeProyecto(req.body));
  res.redirect(`/proyectos/${proyecto._id}`);
});

export const mostrarFormularioEditarProyecto = asyncHandler(async (req, res) => {
  const [proyecto, organizaciones] = await Promise.all([
    proyectoService.obtenerProyectoOFallar(req.params.id),
    Organizacion.find().sort({ nombre: 1 }),
  ]);
  res.render("proyectos/formulario", {
    titulo: `SumarImpacto - Editar ${proyecto.nombre}`,
    modo: "editar",
    proyecto,
    organizaciones,
    error: null,
  });
});

export const actualizarProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  await proyectoService.actualizar(req.params.id, datosDeProyecto(req.body));
  res.redirect(`/proyectos/${req.params.id}`);
});

export const cambiarEstadoProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  await proyectoService.cambiarActivo(req.params.id, req.body.activo === "true");
  res.redirect(`/proyectos/${req.params.id}`);
});

export const eliminarProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  await proyectoService.eliminar(req.params.id);
  res.redirect("/");
});

export const mostrarFormularioNuevoDonante = asyncHandler(async (req, res) => {
  res.render("donantes/formulario", { titulo: "SumarImpacto - Nuevo donante", modo: "crear", donante: {} });
});

export const crearDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  const donante = await Donante.create({ nombre: req.body.nombre, email: req.body.email, tipo: req.body.tipo });
  res.redirect(`/donantes/${donante._id}`);
});

export const mostrarFormularioEditarDonante = asyncHandler(async (req, res) => {
  const donante = await Donante.findById(req.params.id);
  if (!donante) throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  res.render("donantes/formulario", { titulo: `SumarImpacto - Editar ${donante.nombre}`, modo: "editar", donante });
});

export const actualizarDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  const actualizado = await Donante.findByIdAndUpdate(req.params.id, { nombre: req.body.nombre, email: req.body.email, tipo: req.body.tipo }, {
    runValidators: true,
    context: "query",
  });
  if (!actualizado) throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  res.redirect(`/donantes/${req.params.id}`);
});

export const eliminarDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  if (await Donacion.exists({ donante: req.params.id })) throw ApiError.conflict("No se puede eliminar un donante con donaciones registradas.");
  const eliminado = await Donante.findByIdAndDelete(req.params.id);
  if (!eliminado) throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  res.redirect("/donantes");
});

export const mostrarFormularioNuevaOrganizacion = asyncHandler(async (req, res) => {
  res.render("organizaciones/formulario", {
    titulo: "SumarImpacto - Nueva organización",
    modo: "crear",
    organizacion: {},
  });
});

export const crearOrganizacionDesdeFormulario = asyncHandler(async (req, res) => {
  const organizacion = await Organizacion.create({ nombre: req.body.nombre, descripcion: req.body.descripcion });
  res.redirect(`/organizaciones/${organizacion._id}`);
});

export const mostrarFormularioEditarOrganizacion = asyncHandler(async (req, res) => {
  const organizacion = await Organizacion.findById(req.params.id);
  if (!organizacion) throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  res.render("organizaciones/formulario", {
    titulo: `SumarImpacto - Editar ${organizacion.nombre}`,
    modo: "editar",
    organizacion,
  });
});

export const actualizarOrganizacionDesdeFormulario = asyncHandler(async (req, res) => {
  const actualizada = await Organizacion.findByIdAndUpdate(req.params.id, { nombre: req.body.nombre, descripcion: req.body.descripcion }, {
    runValidators: true,
    context: "query",
  });
  if (!actualizada) throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  res.redirect(`/organizaciones/${req.params.id}`);
});

export const eliminarOrganizacionDesdeFormulario = asyncHandler(async (req, res) => {
  if (await Proyecto.exists({ organizacion: req.params.id })) throw ApiError.conflict("No se puede eliminar una organización con proyectos asociados.");
  const eliminada = await Organizacion.findByIdAndDelete(req.params.id);
  if (!eliminada) throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  res.redirect("/organizaciones");
});

export const mostrarFormularioNuevaDonacion = asyncHandler(async (req, res) => {
  const [donantes, proyectos, campanias] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Proyecto.find({ activo: { $ne: false } }).sort({ nombre: 1 }),
    Campania.find({ activa: true }).sort({ nombre: 1 }),
  ]);
  res.render("donaciones/formulario", {
    titulo: "SumarImpacto - Nueva donación",
    modo: "crear",
    donacion: { proyecto: req.query.proyectoId || "" },
    donantes,
    proyectos,
    campanias,
  });
});

const datosDeDonacion = (body) => ({ donante: body.donante, proyecto: body.proyecto, campania: body.campania, monto: body.monto, fecha: body.fecha });
const destinoDeDonacion = (donacion) => (donacion.proyecto ? `/proyectos/${donacion.proyecto}` : `/donantes/${donacion.donante}`);

export const crearDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  const donacion = await donacionService.crear(datosDeDonacion(req.body));
  res.redirect(destinoDeDonacion(donacion));
});

export const mostrarFormularioEditarDonacion = asyncHandler(async (req, res) => {
  const donacion = await donacionService.obtenerModificableOFallar(req.params.id);
  const [donantes, proyectos, campanias] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Proyecto.find({ activo: { $ne: false } }).sort({ nombre: 1 }),
    Campania.find({ activa: true }).sort({ nombre: 1 }),
  ]);
  res.render("donaciones/formulario", {
    titulo: "SumarImpacto - Editar donación",
    modo: "editar",
    donacion,
    donantes,
    proyectos,
    campanias,
  });
});

export const actualizarDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  const actualizada = await donacionService.actualizar(req.params.id, datosDeDonacion(req.body));
  res.redirect(destinoDeDonacion(actualizada));
});

export const eliminarDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  const eliminada = await donacionService.eliminar(req.params.id);
  res.redirect(destinoDeDonacion(eliminada));
});

export const mostrarFormularioNuevoGasto = asyncHandler(async (req, res) => {
  const filtro = req.user?.rol === ROLES.REFERENTE ? { organizacion: req.user.organizacion, activo: { $ne: false } } : { activo: { $ne: false } };
  const proyectosDb = await Proyecto.find(filtro).sort({ nombre: 1 });
  const saldos = await proyectoService.calcularSaldos(proyectosDb.map((proyecto) => proyecto._id));
  const proyectos = proyectosDb
    .filter((proyecto) => (saldos.get(String(proyecto._id))?.saldoDisponible ?? 0) > 0)
    .map((proyecto) => proyecto.toObject());
  const proyectoSeleccionado = proyectos.find((proyecto) => String(proyecto._id) === String(req.query.proyectoId));
  res.render("gastos/formulario", {
    titulo: "SumarImpacto - Nuevo gasto",
    gasto: { proyecto: req.query.proyectoId || "" },
    proyectos,
    rubrosIniciales: proyectoSeleccionado?.rubros?.map((rubro) => rubro.nombre) || [],
  });
});

export const crearGastoDesdeFormulario = asyncHandler(async (req, res) => {
  const gasto = await rendicionService.registrar({ datos: req.body, archivo: req.file, usuario: req.user });
  res.redirect(`/proyectos/${gasto.proyecto}`);
});
