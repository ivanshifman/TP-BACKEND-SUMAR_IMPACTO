import mongoose from "mongoose";

import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Copiá .env.example a .env y completá la cadena de conexión."
    );
  }

  mongoose.connection.on("connected", () => {
    console.log(`MongoDB conectado → ${mongoose.connection.name}`);
  });

  mongoose.connection.on("error", (error) => {
    console.error("Error de conexión a MongoDB:", error.message);
  });

  await mongoose.connect(uri);
}

export default connectDB;
