import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import methodOverride from "method-override";
import requestLogger from "./middleware/requestLogger.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";
import viewsRoutes from "./routes/views.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(requestLogger);

app.use("/", viewsRoutes);

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
