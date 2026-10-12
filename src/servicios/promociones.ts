import { promocionesMock } from '@/mocks';
import type { Promocion } from '@/tipos';
import { estadoPromocion } from '@/utilidades/promociones';

import { ErrorApi, respuestaMock } from './cliente';

// Igual que en comercios.ts: hoy devuelve el mock, mañana hace fetch.
// El PRD es explícito: una promo vencida no se muestra más, así que el
// propio servicio la filtra antes de entregar la lista.
export async function listarPromociones(): Promise<Promocion[]> {
  const { datos } = await respuestaMock(
    () => promocionesMock.filter((p) => p.activa && estadoPromocion(p) !== 'vencida'),
    [],
  );
  return datos;
}

export async function obtenerPromocion(id: string): Promise<Promocion> {
  const { datos } = await respuestaMock(
    () => promocionesMock.find((p) => p.id === id) ?? null,
    null,
  );
  if (!datos) {
    throw new ErrorApi({
      codigo: 'PROMOCION_NO_ENCONTRADA',
      mensaje: 'No encontramos esa promoción.',
    });
  }
  return datos;
}
