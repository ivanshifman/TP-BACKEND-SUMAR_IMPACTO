/**
 * Exclusión mutua por clave dentro de un mismo proceso.
 * Serializa las tareas que comparten clave (por ejemplo, el id de un proyecto) para que
 * dos solicitudes simultáneas no calculen el saldo sobre el mismo estado y lo superen.
 *
 * Alcance: protege una sola instancia del servidor. Con varias instancias haría falta
 * un bloqueo distribuido o una transacción de MongoDB (replica set).
 */
const colas = new Map();

export async function conBloqueo(clave, tarea) {
  const anterior = colas.get(clave) ?? Promise.resolve();
  let liberar;
  const turno = new Promise((resolve) => { liberar = resolve; });
  const cola = anterior.then(() => turno);
  colas.set(clave, cola);
  await anterior;
  try {
    return await tarea();
  } finally {
    liberar();
    if (colas.get(clave) === cola) colas.delete(clave);
  }
}

export const bloqueosActivos = () => colas.size;
