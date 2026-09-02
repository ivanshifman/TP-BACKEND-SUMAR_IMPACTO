const express = require("express");
const path = require("path");

const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const apiRoutes = require("./routes/index");
const viewsRoutes = require("./routes/views.routes");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(express.json());
app.use(requestLogger);

app.use("/", viewsRoutes);

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
