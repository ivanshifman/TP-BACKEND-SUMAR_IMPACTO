import auditoriaService from "../services/AuditoriaService.js";

const METODOS_DE_ESCRITURA = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LECTURAS_SENSIBLES = [/\/comprobante$/, /\/reporte(\.pdf)?$/];
const ID_MONGO = /[0-9a-f]{24}/i;

export const debeAuditarse = (metodo, ruta) =>
  METODOS_DE_ESCRITURA.has(metodo) || (metodo === "GET" && LECTURAS_SENSIBLES.some((patron) => patron.test(ruta)));

export const resultadoSegunEstado = (estado) => (estado >= 500 ? "error" : estado >= 400 ? "rechazado" : "ok");

export function auditar({ registrar = (evento) => auditoriaService.registrar(evento) } = {}) {
  return (req, res, next) => {
    res.on("finish", () => {
      const ruta = req.originalUrl.split("?")[0];
      if (!debeAuditarse(req.method, ruta)) return;
      const usuario = req.user ?? res.locals?.usuarioAuditoria ?? null;
      const evento = {
        usuario: usuario?._id ?? null,
        email: usuario?.email ?? null,
        rol: usuario?.rol ?? null,
        metodo: req.method,
        ruta: ruta.slice(0, 300),
        recursoId: ruta.match(ID_MONGO)?.[0] ?? null,
        estado: res.statusCode,
        resultado: resultadoSegunEstado(res.statusCode),
        ip: req.ip ?? null,
        userAgent: req.get?.("user-agent")?.slice(0, 200) ?? null,
      };
      Promise.resolve()
        .then(() => registrar(evento))
        .catch((error) => console.error("No se pudo registrar la bitácora de auditoría:", error.message));
    });
    next();
  };
}

export default auditar;
