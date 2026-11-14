import { afterEach, describe, expect, jest, test } from "@jest/globals";
import dns from "node:dns";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

const uriInicial = process.env.MONGODB_URI;

afterEach(() => {
  if (uriInicial === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = uriInicial;
  jest.restoreAllMocks();
});

describe("connectDB", () => {
  test("informa claramente si falta MONGODB_URI", async () => {
    delete process.env.MONGODB_URI;
    const conectar = jest.spyOn(mongoose, "connect");

    await expect(connectDB()).rejects.toThrow("Falta MONGODB_URI");
    expect(conectar).not.toHaveBeenCalled();
  });

  test("configura MongoDB, registra eventos de conexión e informa errores de conexión", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/prueba";
    const servidoresDns = jest.spyOn(dns, "setServers").mockImplementation(() => {});
    const configurar = jest.spyOn(mongoose, "set").mockReturnThis();
    const conectar = jest.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
    const eventos = new Map();
    jest.spyOn(mongoose.connection, "on").mockImplementation((evento, callback) => {
      eventos.set(evento, callback);
      return mongoose.connection;
    });
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await expect(connectDB()).resolves.toBeUndefined();

    expect(servidoresDns).toHaveBeenCalledWith(["8.8.8.8", "1.1.1.1"]);
    expect(configurar).toHaveBeenCalledWith("strictQuery", true);
    expect(conectar).toHaveBeenCalledWith(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

    eventos.get("connected")();
    eventos.get("error")(new Error("conexión interrumpida"));
    eventos.get("disconnected")();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("MongoDB conectado"));
    expect(error).toHaveBeenCalledWith("Error de MongoDB:", "conexión interrumpida");
    expect(warn).toHaveBeenCalledWith("MongoDB desconectado.");
  });

  test("propaga fallos de mongoose.connect", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/prueba";
    const fallo = new Error("sin conexión");
    jest.spyOn(dns, "setServers").mockImplementation(() => {});
    jest.spyOn(mongoose, "set").mockReturnThis();
    jest.spyOn(mongoose.connection, "on").mockReturnThis();
    jest.spyOn(mongoose, "connect").mockRejectedValue(fallo);

    await expect(connectDB()).rejects.toBe(fallo);
  });
});
