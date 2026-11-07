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
  const filtro = req.user?.rol === "referente_territorial" ? { organizacion: req.user.organizacion } : {};
  filtro.activo = { $ne: false };
  const proyectosDb = await Proyecto.find(filtro).populate("organizacion", "nombre").sort({ nombre: 1 });

  const proyectos = await Promise.all(
    proyectosDb.map(async (proyecto) => {
      const { totalDonado, totalGastado, totalComprometido, saldoDisponible } = await proyectoService.calcularSaldoDisponible(
        proyecto._id
      );
      return {
        ...proyecto.toObject(),
        organizacionNombre: proyecto.organizacion ? proyecto.organizacion.nombre : "Organización no encontrada",
        totalDonado,
        totalGastado,
        totalComprometido,
        saldoDisponible,
      };
    })
  );

  res.render("index", { titulo: "SumarImpacto - Proyectos", proyectos });
});

export const detalleProyecto = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.user?.rol === "referente_territorial" && String(proyecto.organizacion) !== String(req.user.organizacion)) throw ApiError.forbidden();
  await proyecto.populate("organizacion");

  const donacionesDb = await Donacion.find({ proyecto: proyecto._id }).populate("donante", "nombre").sort({ fecha: 1 });
  const gastos = await Gasto.find({ proyecto: proyecto._id }).select("-comprobante.contenido").populate("cargadoPor", "nombre").sort({ fecha: 1 });
  const { totalDonado, totalGastado, totalComprometido, saldoDisponible } = await proyectoService.calcularSaldoDisponible(proyecto._id);

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
  const [donantesDb, donaciones] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Donacion.find(),
  ]);

  const donantes = donantesDb.map((donante) => {
    const propias = donaciones.filter((d) => String(d.donante) === String(donante._id));
    const totalDonado = propias.reduce((acc, d) => acc + d.monto, 0);
    return { ...donante.toObject(), cantidadDonaciones: propias.length, totalDonado };
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
  const [organizacionesDb, proyectos] = await Promise.all([
    Organizacion.find().sort({ nombre: 1 }),
    Proyecto.find(),
  ]);

  const organizaciones = organizacionesDb.map((organizacion) => ({
    ...organizacion.toObject(),
    cantidadProyectos: proyectos.filter((p) => String(p.organizacion) === String(organizacion._id)).length,
  }));

  res.render("organizaciones/lista", { titulo: "SumarImpacto - Organizaciones", organizaciones });
});

export const detalleOrganizacion = asyncHandler(async (req, res) => {
  const organizacion = await Organizacion.findById(req.params.id);
  if (!organizacion) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  const proyectosDb = await Proyecto.find({ organizacion: organizacion._id }).sort({ nombre: 1 });
  const proyectos = await Promise.all(
    proyectosDb.map(async (proyecto) => {
      const { saldoDisponible } = await proyectoService.calcularSaldoDisponible(proyecto._id);
      return { ...proyecto.toObject(), saldoDisponible };
    })
  );

  res.render("organizaciones/detalle", {
    titulo: `SumarImpacto - ${organizacion.nombre}`,
    organizacion,
    proyectos,
  });
});

export const listarGastos = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.user?.rol === "referente_territorial") { const propios = await Proyecto.find({ organizacion: req.user.organizacion }).select("_id"); filtro.proyecto = { $in: propios.map((p) => p._id) }; }
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

export const crearProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  await proyectoService.validarOrganizacionExiste(req.body.organizacion);
  const proyecto = await Proyecto.create({ nombre: req.body.nombre, organizacion: req.body.organizacion, montoObjetivo: req.body.montoObjetivo || undefined, ...normalizarPresupuesto(req.body) });
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
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  await proyectoService.validarOrganizacionExiste(req.body.organizacion);
  const proyecto = await Proyecto.findById(req.params.id);
  Object.assign(proyecto, { nombre: req.body.nombre, organizacion: req.body.organizacion, montoObjetivo: req.body.montoObjetivo || undefined, ...normalizarPresupuesto(req.body) });
  await proyecto.save();
  res.redirect(`/proyectos/${req.params.id}`);
});

export const eliminarProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  const [donaciones, gastos] = await Promise.all([Donacion.exists({ proyecto: req.params.id }), Gasto.exists({ proyecto: req.params.id })]);
  if (donaciones || gastos) throw ApiError.conflict("No se puede eliminar un proyecto con movimientos asociados. Desactivalo o archivá su información.");
  await Proyecto.findByIdAndDelete(req.params.id);
  res.redirect("/");
});

export const mostrarFormularioNuevoDonante = asyncHandler(async (req, res) => {
  res.render("donantes/formulario", { titulo: "SumarImpacto - Nuevo donante", modo: "crear", donante: {} });
});

export const crearDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  const donante = await Donante.create({ nombre: req.body.nombre, email: req.body.email, tipo: req.body.tipo, frecuenciaNotificacion: req.body.frecuenciaNotificacion || "inmediata" });
  res.redirect(`/donantes/${donante._id}`);
});

export const mostrarFormularioEditarDonante = asyncHandler(async (req, res) => {
  const donante = await Donante.findById(req.params.id);
  if (!donante) throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  res.render("donantes/formulario", { titulo: `SumarImpacto - Editar ${donante.nombre}`, modo: "editar", donante });
});

export const actualizarDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  const actualizado = await Donante.findByIdAndUpdate(req.params.id, { nombre: req.body.nombre, email: req.body.email, tipo: req.body.tipo, frecuenciaNotificacion: req.body.frecuenciaNotificacion || "inmediata" }, {
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
    Proyecto.find().sort({ nombre: 1 }),
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

export const crearDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  await donacionService.validarDonanteExiste(req.body.donante);
  await donacionService.validarProyectoExisteSiCorresponde(req.body.proyecto || null);
  if (req.body.campania && !(await Campania.exists({ _id: req.body.campania }))) throw ApiError.badRequest("La campaña seleccionada no existe.");
  const donacion = await Donacion.create({
    donante: req.body.donante, monto: req.body.monto, fecha: req.body.fecha || undefined,
    proyecto: req.body.proyecto || null, campania: req.body.campania || null,
  });
  res.redirect(donacion.proyecto ? `/proyectos/${donacion.proyecto}` : `/donantes/${donacion.donante}`);
});

export const mostrarFormularioEditarDonacion = asyncHandler(async (req, res) => {
  const donacion = await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  const [donantes, proyectos, campanias] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Proyecto.find().sort({ nombre: 1 }),
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
  await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  await donacionService.validarDonanteExiste(req.body.donante);
  await donacionService.validarProyectoExisteSiCorresponde(req.body.proyecto || null);
  if (req.body.campania && !(await Campania.exists({ _id: req.body.campania }))) throw ApiError.badRequest("La campaña seleccionada no existe.");
  const actualizada = await Donacion.findByIdAndUpdate(
    req.params.id,
    { donante: req.body.donante, monto: req.body.monto, fecha: req.body.fecha || undefined, proyecto: req.body.proyecto || null, campania: req.body.campania || null },
    { new: true, runValidators: true, context: "query" }
  );
  res.redirect(actualizada.proyecto ? `/proyectos/${actualizada.proyecto}` : `/donantes/${actualizada.donante}`);
});

export const eliminarDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  const donacion = await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  const redirectA = donacion.proyecto ? `/proyectos/${donacion.proyecto}` : `/donantes/${donacion.donante}`;
  await Donacion.findByIdAndDelete(req.params.id);
  res.redirect(redirectA);
});

export const mostrarFormularioNuevoGasto = asyncHandler(async (req, res) => {
  const filtro = req.user?.rol === "referente_territorial" ? { organizacion: req.user.organizacion, activo: { $ne: false } } : { activo: { $ne: false } };
  filtro.presupuestoTotal = { $gt: 0 };
  filtro.periodoInicio = { $exists: true };
  filtro.periodoFin = { $exists: true };
  filtro.rubros = { $exists: true, $ne: [] };
  const proyectos = await Proyecto.find(filtro).sort({ nombre: 1 });
  res.render("gastos/formulario", {
    titulo: "SumarImpacto - Nuevo gasto",
    gasto: { proyecto: req.query.proyectoId || "" },
    proyectos,
  });
});

export const crearGastoDesdeFormulario = asyncHandler(async (req, res) => {
  const gasto = await rendicionService.registrar({ datos: req.body, archivo: req.file, usuario: req.user });
  res.redirect(`/proyectos/${gasto.proyecto}`);
});
