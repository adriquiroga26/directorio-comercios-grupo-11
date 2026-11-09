import {
  borrarPendiente,
  guardarPendiente,
  listarPendientes,
  marcarRechazada,
} from '@/almacen/resenasPendientes';
import type { ResenaPendiente } from '@/tipos';
import { nuevoIdDeResena } from '@/utilidades/resenasPendientes';

import { ErrorApi } from './cliente';
import { type DatosResena, enviarResena } from './resenas';

// Reseñas escritas sin conexión (lo pide el PRD: "reseñas pendientes de subir"). La regla:
//  1. Al publicar, la reseña ya nace con su id. Se intenta enviar a la API.
//  2. Si no hay conexión (o el servidor no responde), se guarda en el teléfono y se avisa.
//  3. Cuando vuelve la conexión se envía sola. Como el id es el mismo, si el primer envío había
//     llegado pero la respuesta se perdió, la API no la duplica.

export type ResultadoPublicacion = 'enviada' | 'pendiente';

// Los errores en los que NO se sabe si la API recibió la reseña o no: conviene guardarla y
// reintentar más tarde. Cualquier otro error es una respuesta clara de la API (por ejemplo
// "ya dejaste una reseña") y se le muestra tal cual a la persona.
function sinRespuesta(error: unknown): boolean {
  return (
    error instanceof ErrorApi && (error.codigo === 'SIN_CONEXION' || error.codigo === 'ERROR_INTERNO')
  );
}

export async function publicarResena(
  usuarioId: string,
  comercioId: string,
  datos: DatosResena,
): Promise<ResultadoPublicacion> {
  const id = nuevoIdDeResena();
  try {
    await enviarResena({ id, comercioId, ...datos });
    return 'enviada';
  } catch (error) {
    if (!sinRespuesta(error)) throw error;
    try {
      await guardarPendiente({
        id,
        usuarioId,
        comercioId,
        estrellas: datos.estrellas,
        comentario: datos.comentario,
        creadaEn: new Date().toISOString(),
        error: null,
      });
    } catch {
      // Si ni siquiera se pudo guardar, se avisa el problema de conexión original.
      throw error;
    }
    return 'pendiente';
  }
}

// Manda la reseña con la fecha en que se escribió. Si el reloj del teléfono estaba adelantado y
// la API la rechaza por "fecha en el futuro", se reenvía sin fecha (la API pone la de ahora).
async function enviarPendiente(pendiente: ResenaPendiente): Promise<void> {
  const datos = {
    id: pendiente.id,
    comercioId: pendiente.comercioId,
    estrellas: pendiente.estrellas,
    comentario: pendiente.comentario,
  };
  try {
    await enviarResena({ ...datos, creadaEn: pendiente.creadaEn });
  } catch (error) {
    if (error instanceof ErrorApi && error.codigo === 'FECHA_EN_EL_FUTURO') {
      await enviarResena(datos);
      return;
    }
    throw error;
  }
}

export interface ResumenDeEnvio {
  enviadas: number;
  rechazadas: number;
}

// Envía las pendientes de una cuenta, de la más vieja a la más nueva.
//  - Salió bien: se borra de la cola.
//  - Sin conexión, servidor caído o sesión vencida: se corta y se reintenta más tarde.
//  - La API la rechaza para siempre (por ejemplo, ya había una reseña de ese comercio): se marca
//    con el motivo y no se reintenta, para que la persona vea qué pasó.
export async function enviarPendientes(usuarioId: string): Promise<ResumenDeEnvio> {
  const pendientes = (await listarPendientes(usuarioId)).filter((p) => p.error === null);
  const resumen: ResumenDeEnvio = { enviadas: 0, rechazadas: 0 };

  for (const pendiente of pendientes) {
    try {
      await enviarPendiente(pendiente);
      await borrarPendiente(pendiente.id);
      resumen.enviadas += 1;
    } catch (error) {
      if (!(error instanceof ErrorApi)) break;
      if (sinRespuesta(error) || error.codigo === 'NO_AUTENTICADO') break;
      await marcarRechazada(pendiente.id, error.message);
      resumen.rechazadas += 1;
    }
  }
  return resumen;
}

export { borrarPendiente as descartarPendiente, listarPendientes };
