import { comerciosMock, rubrosMock } from '@/mocks';
import type { Comercio, Rubro } from '@/tipos';

import { ErrorApi, respuestaMock } from './cliente';

// Hoy devuelve mocks; cuando llegue la API se reemplaza el cuerpo por fetch
// y la firma (async, mismos tipos) no cambia.

export async function listarComercios(): Promise<Comercio[]> {
  const { datos } = await respuestaMock(
    () => comerciosMock.filter((c) => c.activo),
    [],
  );
  return datos;
}

export async function obtenerComercio(id: string): Promise<Comercio> {
  const { datos } = await respuestaMock(
    () => comerciosMock.find((c) => c.id === id) ?? null,
    null,
  );
  if (!datos) {
    throw new ErrorApi({
      codigo: 'COMERCIO_NO_ENCONTRADO',
      mensaje: 'No encontramos ese comercio.',
    });
  }
  return datos;
}

export async function listarRubros(): Promise<Rubro[]> {
  const { datos } = await respuestaMock(
    () => [...rubrosMock].sort((a, b) => a.orden - b.orden),
    [],
  );
  return datos;
}
