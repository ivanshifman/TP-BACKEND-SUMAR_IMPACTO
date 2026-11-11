import Auditoria from "../models/Auditoria.js";

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 100;

class AuditoriaService {
  registrar(evento) {
    return Auditoria.create(evento);
  }

  async listar({ pagina = 1, limite = LIMITE_POR_DEFECTO, metodo, resultado, email } = {}) {
    const filtro = {};
    if (metodo) filtro.metodo = String(metodo);
    if (resultado) filtro.resultado = String(resultado);
    if (email) filtro.email = String(email).trim().toLowerCase();

    const tamanio = Math.min(Math.max(Number(limite) || LIMITE_POR_DEFECTO, 1), LIMITE_MAXIMO);
    const actual = Math.max(Number(pagina) || 1, 1);
    const [datos, total] = await Promise.all([
      Auditoria.find(filtro).sort({ fecha: -1 }).skip((actual - 1) * tamanio).limit(tamanio).lean(),
      Auditoria.countDocuments(filtro),
    ]);
    return { datos, total, pagina: actual, limite: tamanio, paginas: Math.max(Math.ceil(total / tamanio), 1) };
  }
}

export const auditoriaService = new AuditoriaService();
export default auditoriaService;
