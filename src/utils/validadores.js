import { body, query } from "express-validator";
import { LIMITES } from "../config/validacion.js";
import { normalizarEmail } from "./email.js";
import { esFechaFutura } from "./fechas.js";
import { evaluarPassword } from "./politicaPassword.js";

/** Email obligatorio, normalizado (minúsculas, sin espacios) y con formato válido. */
export const validarEmail = (campo = "email") => body(campo)
  .isString().withMessage("El email es obligatorio.").bail()
  .customSanitizer(normalizarEmail)
  .isEmail().withMessage("El email no tiene un formato válido.")
  .isLength({ max: 254 }).withMessage("El email es demasiado largo.");

/** Contraseña que cumple la política del sistema (ver utils/politicaPassword.js). */
export const validarPassword = (campo = "password", campoEmail = "email") => body(campo)
  .isString().withMessage("La contraseña es obligatoria.").bail()
  .custom((valor, { req }) => {
    const problemas = evaluarPassword(valor, { email: req.body?.[campoEmail] });
    if (problemas.length) throw new Error(problemas[0]);
    return true;
  });

/** Monto monetario mayor a cero y con tope máximo. */
export const validarMonto = (campo = "monto") => body(campo)
  .isFloat({ gt: 0, max: LIMITES.MONTO_MAXIMO })
  .withMessage(`El monto debe ser mayor a cero y no superar ${LIMITES.MONTO_MAXIMO.toLocaleString("es-AR")}.`);

/** Fecha ISO 8601 que no puede ser futura. Con `opcional`, admite que falte. */
export const validarFechaNoFutura = (campo = "fecha", { opcional = false } = {}) => {
  const cadena = opcional ? body(campo).optional({ values: "falsy" }) : body(campo);
  return cadena
    .isISO8601().withMessage("La fecha no tiene un formato válido (AAAA-MM-DD).").bail()
    .custom((valor) => !esFechaFutura(valor)).withMessage("La fecha no puede ser futura.");
};

/** Parámetros de consulta de la bitácora (compartidos por la API y la interfaz web). */
export const validarConsultaAuditoria = () => [
  query("pagina").optional().isInt({ min: 1, max: 100000 }).withMessage("La página debe ser un entero positivo."),
  query("limite").optional().isInt({ min: 1, max: 100 }).withMessage("El límite debe estar entre 1 y 100."),
  query("metodo").optional({ values: "falsy" }).isIn(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  query("resultado").optional({ values: "falsy" }).isIn(["ok", "rechazado", "error"]),
  query("email").optional({ values: "falsy" }).isString().isLength({ max: 254 }),
];
