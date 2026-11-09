import { leerComercioGuardado } from '@/almacen/directorio';
import type { Comercio, Rubro } from '@/tipos';

import { ErrorApi, pedir } from './cliente';

// Las firmas (async, mismos tipos) son las mismas que cuando devolvían mocks:
// las pantallas no se enteraron del cambio.

// La API devuelve sólo los comercios activos. porPagina=1000 es el máximo que
// acepta y alcanza para guardar todo el listado en el teléfono.
export async function listarComercios(): Promise<Comercio[]> {
  const { datos } = await pedir<Comercio[]>('/comercios?porPagina=1000');
  return datos;
}

// Si el id no existe, la API responde 404 COMERCIO_NO_ENCONTRADO y `pedir`
// lo convierte en un ErrorApi con el mensaje listo para mostrar.
// Sin conexión (o con el servidor caído) se usa la copia guardada en el teléfono, si la hay.
// Un 404 NO usa la copia: significa que ese comercio ya no existe.
export async function obtenerComercio(id: string): Promise<Comercio> {
  try {
    const { datos } = await pedir<Comercio>(`/comercios/${encodeURIComponent(id)}`);
    return datos;
  } catch (error) {
    const sinRespuesta =
      error instanceof ErrorApi &&
      (error.codigo === 'SIN_CONEXION' || error.codigo === 'ERROR_INTERNO');
    if (sinRespuesta) {
      const guardado = await leerComercioGuardado(id).catch(() => null);
      if (guardado !== null) return guardado;
    }
    throw error;
  }
}

// La API ya los entrega ordenados por `orden`.
export async function listarRubros(): Promise<Rubro[]> {
  const { datos } = await pedir<Rubro[]>('/rubros');
  return datos;
}
