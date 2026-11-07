import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import passport from "passport";
import "./config/passport.js";
import requestLogger from "./middleware/requestLogger.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";
import viewsRoutes from "./routes/views.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { originProtection } from "./middleware/securityHeaders.js";
import { health } from "./controllers/healthController.js";
import * as publicReceipt from "./controllers/publicReceiptController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "same-origin" },
}));

const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({ origin(origin, callback) { if (!origin || corsOrigins.includes(origin)) return callback(null, true); const error = new Error("Origen CORS no permitido."); error.status = 403; return callback(error); }, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false, message: { error: true, mensaje: "Demasiadas solicitudes. Intentá más tarde." } }));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb", parameterLimit: 100 }));
app.use(methodOverride((req) => { if (req.originalUrl.startsWith("/api")) return undefined; return req.body?._method || req.query?._method; }));
app.use(requestLogger);
app.use(originProtection);
app.use(passport.initialize());

app.get("/health", health);
app.get("/comprobantes/public/:token", publicReceipt.descargar);
app.use(authRoutes);
app.use("/api", apiRoutes);
app.use("/", viewsRoutes);
app.use(adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
