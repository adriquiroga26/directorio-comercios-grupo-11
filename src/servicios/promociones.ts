import type { Promocion } from '@/tipos';
import { estadoPromocion } from '@/utilidades/promociones';

import { pedir } from './cliente';

// La API separa las promociones por estado: `vigentes` (incluye las por vencer)
// y `proximas` (las que arrancan en los próximos 7 días). La pantalla muestra
// las dos, así que se piden juntas. Una promo vencida nunca viene en estas
// listas; el filtro de abajo es una segunda defensa por si el reloj del teléfono
// y el del servidor no coinciden (el PRD: "una promo vencida no se muestra más").
export async function listarPromociones(): Promise<Promocion[]> {
  const [vigentes, proximas] = await Promise.all([
    pedir<Promocion[]>('/promociones?estado=vigentes&porPagina=100'),
    pedir<Promocion[]>('/promociones?estado=proximas&porPagina=100'),
  ]);

  return [...vigentes.datos, ...proximas.datos].filter(
    (p) => p.activa && estadoPromocion(p) !== 'vencida',
  );
}

// Una promo vencida da 410 PROMO_VENCIDA y una dada de baja 404; en los dos
// casos llega un ErrorApi con el mensaje para mostrar.
export async function obtenerPromocion(id: string): Promise<Promocion> {
  const { datos } = await pedir<Promocion>(`/promociones/${encodeURIComponent(id)}`);
  return datos;
}
