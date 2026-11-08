import type { Comercio, Rubro } from '@/tipos';

import { pedir } from './cliente';

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
export async function obtenerComercio(id: string): Promise<Comercio> {
  const { datos } = await pedir<Comercio>(`/comercios/${encodeURIComponent(id)}`);
  return datos;
}

// La API ya los entrega ordenados por `orden`.
export async function listarRubros(): Promise<Rubro[]> {
  const { datos } = await pedir<Rubro[]>('/rubros');
  return datos;
}
