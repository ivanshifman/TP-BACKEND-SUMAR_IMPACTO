import mongoose from "mongoose";
export function health(_req, res) {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "degraded", service: "sumarimpacto-api", database: ready ? "connected" : "disconnected", timestamp: new Date().toISOString() });
}
