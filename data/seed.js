/**
 * Script de semilla de datos.
 * Conecta a la base definida en MONGODB_URI, borra las colecciones del
 * dominio y vuelve a cargarlas con datos de ejemplo equivalentes a los
 * que usaba la versión anterior (persistencia en JSON), para poder
 * probar la aplicación de entrada.
 *
 * Uso: npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Donante from "../src/models/Donante.js";
import Organizacion from "../src/models/Organizacion.js";
import Proyecto from "../src/models/Proyecto.js";
import Donacion from "../src/models/Donacion.js";
import Gasto from "../src/models/Gasto.js";

async function seed() {
  await connectDB();

  console.log("Borrando datos existentes...");
  await Promise.all([
    Donante.deleteMany({}),
    Organizacion.deleteMany({}),
    Proyecto.deleteMany({}),
    Donacion.deleteMany({}),
    Gasto.deleteMany({}),
  ]);

  console.log("Creando donantes...");
  const [maria, superSur, jorge] = await Donante.create([
    { nombre: "María Fernández", email: "maria.fernandez@example.com", tipo: "individual" },
    { nombre: "Supermercados del Sur S.A.", email: "rse@supersur.com.ar", tipo: "corporativo" },
    { nombre: "Jorge Alberto Pérez", email: "jorge.perez@example.com", tipo: "individual" },
  ]);

  console.log("Creando organizaciones...");
  const [comedor, fundacion] = await Organizacion.create([
    {
      nombre: "Comedor Comunitario Los Girasoles",
      descripcion:
        "Comedor comunitario ubicado en el barrio Los Girasoles, brinda dos comidas diarias a familias del sector.",
    },
    {
      nombre: "Fundación Semillas de Futuro",
      descripcion:
        "Fundación dedicada al apoyo escolar y la entrega de material educativo a niños en situación de vulnerabilidad.",
    },
  ]);

  console.log("Creando proyectos...");
  const [cocina, kits] = await Proyecto.create([
    { nombre: "Reequipamiento de cocina comunitaria", organizacion: comedor._id, montoObjetivo: 500000 },
    { nombre: "Kits escolares 2026", organizacion: fundacion._id, montoObjetivo: 300000 },
  ]);

  console.log("Creando donaciones...");
  await Donacion.create([
    { donante: maria._id, proyecto: cocina._id, monto: 50000, fecha: new Date("2026-08-01") },
    { donante: superSur._id, proyecto: cocina._id, monto: 200000, fecha: new Date("2026-08-05") },
    { donante: jorge._id, proyecto: kits._id, monto: 80000, fecha: new Date("2026-08-10") },
  ]);

  console.log("Datos de ejemplo cargados correctamente.");
  await mongoose.connection.close();
}

seed().catch((error) => {
  console.error("Error al cargar los datos de ejemplo:", error);
  process.exit(1);
});
