import mongoose from "mongoose";
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI. Configurá MongoDB Atlas o una instancia local en el archivo .env.");
  mongoose.set("strictQuery", true);
  mongoose.connection.on("connected", () => console.log(`MongoDB conectado → ${mongoose.connection.name}`));
  mongoose.connection.on("error", (error) => console.error("Error de MongoDB:", error.message));
  mongoose.connection.on("disconnected", () => console.warn("MongoDB desconectado."));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}
export default connectDB;
