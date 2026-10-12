import type { Promocion } from '@/tipos';

// Igual que "abierto ahora" en horarios.ts: si una promo está vigente, por
// empezar o vencida NO es un dato que venga de la API, se calcula acá
// comparando desde/hasta con la hora actual. El PRD es explícito con esto:
// "una promo que ya venció no se muestra más".
export type EstadoPromocion = 'vigente' | 'proxima' | 'vencida';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function estadoPromocion(promocion: Promocion, ahora: Date = new Date()): EstadoPromocion {
  const ahoraMs = ahora.getTime();
  const desdeMs = Date.parse(promocion.desde);
  const hastaMs = Date.parse(promocion.hasta);

  if (ahoraMs > hastaMs) return 'vencida';
  if (ahoraMs < desdeMs) return 'proxima';
  return 'vigente';
}

// Una promo vigente "está por vencer" si le quedan 3 días o menos. Es sólo
// para resaltarla en la lista (PRD: "las que están por vencer"), no cambia
// si se muestra o no.
export function estaPorVencer(promocion: Promocion, ahora: Date = new Date(), diasAviso = 3): boolean {
  if (estadoPromocion(promocion, ahora) !== 'vigente') return false;
  const hastaMs = Date.parse(promocion.hasta);
  return hastaMs - ahora.getTime() <= diasAviso * UN_DIA_MS;
}
