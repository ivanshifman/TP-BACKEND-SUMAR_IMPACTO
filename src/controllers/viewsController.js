import Proyecto from "../models/Proyecto.js";
import Organizacion from "../models/Organizacion.js";
import Donante from "../models/Donante.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import proyectoService from "../services/ProyectoService.js";
import donacionService from "../services/DonacionService.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

export const inicio = asyncHandler(async (req, res) => {
  const proyectosDb = await Proyecto.find().populate("organizacion", "nombre").sort({ nombre: 1 });

  const proyectos = await Promise.all(
    proyectosDb.map(async (proyecto) => {
      const { totalDonado, totalGastado, saldoDisponible } = await proyectoService.calcularSaldoDisponible(
        proyecto._id
      );
      return {
        ...proyecto.toObject(),
        organizacionNombre: proyecto.organizacion ? proyecto.organizacion.nombre : "Organización no encontrada",
        totalDonado,
        totalGastado,
        saldoDisponible,
      };
    })
  );

  res.render("index", { titulo: "SumarImpacto - Proyectos", proyectos });
});

export const detalleProyecto = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  await proyecto.populate("organizacion");

  const donacionesDb = await Donacion.find({ proyecto: proyecto._id }).populate("donante", "nombre").sort({ fecha: 1 });
  const gastos = await Gasto.find({ proyecto: proyecto._id }).sort({ fecha: 1 });
  const { totalDonado, totalGastado, saldoDisponible } = await proyectoService.calcularSaldoDisponible(proyecto._id);

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
  const gastosDb = await Gasto.find().populate("proyecto", "nombre").sort({ fecha: -1 });
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
  const proyecto = await Proyecto.create(req.body);
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
  await Proyecto.findByIdAndUpdate(req.params.id, req.body, { runValidators: true, context: "query" });
  res.redirect(`/proyectos/${req.params.id}`);
});

export const eliminarProyectoDesdeFormulario = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  await Proyecto.findByIdAndDelete(req.params.id);
  res.redirect("/");
});

export const mostrarFormularioNuevoDonante = asyncHandler(async (req, res) => {
  res.render("donantes/formulario", { titulo: "SumarImpacto - Nuevo donante", modo: "crear", donante: {} });
});

export const crearDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  const donante = await Donante.create(req.body);
  res.redirect(`/donantes/${donante._id}`);
});

export const mostrarFormularioEditarDonante = asyncHandler(async (req, res) => {
  const donante = await Donante.findById(req.params.id);
  if (!donante) throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  res.render("donantes/formulario", { titulo: `SumarImpacto - Editar ${donante.nombre}`, modo: "editar", donante });
});

export const actualizarDonanteDesdeFormulario = asyncHandler(async (req, res) => {
  const actualizado = await Donante.findByIdAndUpdate(req.params.id, req.body, {
    runValidators: true,
    context: "query",
  });
  if (!actualizado) throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  res.redirect(`/donantes/${req.params.id}`);
});

export const eliminarDonanteDesdeFormulario = asyncHandler(async (req, res) => {
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
  const organizacion = await Organizacion.create(req.body);
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
  const actualizada = await Organizacion.findByIdAndUpdate(req.params.id, req.body, {
    runValidators: true,
    context: "query",
  });
  if (!actualizada) throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  res.redirect(`/organizaciones/${req.params.id}`);
});

export const eliminarOrganizacionDesdeFormulario = asyncHandler(async (req, res) => {
  const eliminada = await Organizacion.findByIdAndDelete(req.params.id);
  if (!eliminada) throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  res.redirect("/organizaciones");
});

export const mostrarFormularioNuevaDonacion = asyncHandler(async (req, res) => {
  const [donantes, proyectos] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Proyecto.find().sort({ nombre: 1 }),
  ]);
  res.render("donaciones/formulario", {
    titulo: "SumarImpacto - Nueva donación",
    modo: "crear",
    donacion: { proyecto: req.query.proyectoId || "" },
    donantes,
    proyectos,
  });
});

export const crearDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  await donacionService.validarDonanteExiste(req.body.donante);
  await donacionService.validarProyectoExisteSiCorresponde(req.body.proyecto || null);
  const donacion = await Donacion.create({
    ...req.body,
    proyecto: req.body.proyecto || null,
  });
  res.redirect(donacion.proyecto ? `/proyectos/${donacion.proyecto}` : `/donantes/${donacion.donante}`);
});

export const mostrarFormularioEditarDonacion = asyncHandler(async (req, res) => {
  const donacion = await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  const [donantes, proyectos] = await Promise.all([
    Donante.find().sort({ nombre: 1 }),
    Proyecto.find().sort({ nombre: 1 }),
  ]);
  res.render("donaciones/formulario", {
    titulo: "SumarImpacto - Editar donación",
    modo: "editar",
    donacion,
    donantes,
    proyectos,
  });
});

export const actualizarDonacionDesdeFormulario = asyncHandler(async (req, res) => {
  await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  await donacionService.validarDonanteExiste(req.body.donante);
  await donacionService.validarProyectoExisteSiCorresponde(req.body.proyecto || null);
  const actualizada = await Donacion.findByIdAndUpdate(
    req.params.id,
    { ...req.body, proyecto: req.body.proyecto || null },
    { runValidators: true, context: "query" }
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
  const proyectos = await Proyecto.find().sort({ nombre: 1 });
  res.render("gastos/formulario", {
    titulo: "SumarImpacto - Nuevo gasto",
    gasto: { proyecto: req.query.proyectoId || "" },
    proyectos,
  });
});

export const crearGastoDesdeFormulario = asyncHandler(async (req, res) => {
  const { proyecto: proyectoId, monto } = req.body;
  await proyectoService.obtenerProyectoOFallar(proyectoId);
  await proyectoService.validarGastoContraSaldo(proyectoId, Number(monto));
  await Gasto.create(req.body);
  await proyectoService.marcarDonacionesUtilizadas(proyectoId, Number(monto));
  res.redirect(`/proyectos/${proyectoId}`);
});
