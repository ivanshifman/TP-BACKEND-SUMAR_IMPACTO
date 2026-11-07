import multer from "multer";
import ApiError from "../utils/ApiError.js";

const MIME_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
export const uploadComprobante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!MIME_PERMITIDOS.has(file.mimetype)) return callback(ApiError.badRequest("Formato no admitido. Usá JPG, PNG, WEBP o PDF."));
    callback(null, true);
  },
}).single("comprobante");
