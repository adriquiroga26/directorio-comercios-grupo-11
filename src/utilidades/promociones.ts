import type { Promocion } from '@/tipos';

import { claveDelDia } from './fechas';

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

// ---- Panel del comercio ----

// Para la lista del comercio: además de los tres estados por fechas, una promo dada de
// baja (`activa: false`) se muestra aparte.
export type EstadoMiPromocion = EstadoPromocion | 'baja';

export function estadoMiPromocion(promocion: Promocion, ahora: Date = new Date()): EstadoMiPromocion {
  if (!promocion.activa) return 'baja';
  return estadoPromocion(promocion, ahora);
}

// El comercio elige días en un calendario, pero la API pide fecha y hora con zona
// ("2026-10-01T00:00:00-03:00"). Una promo empieza a las 00:00 del día elegido y termina
// a las 23:59 del día elegido, siempre en hora de Argentina (UTC-3), igual que "abierto
// ahora". Se arma con el día tal como lo eligió el usuario, sin conversiones de huso.
export function inicioDelDiaIso(fecha: Date): string {
  return `${claveDelDia(fecha)}T00:00:00-03:00`;
}

export function finDelDiaIso(fecha: Date): string {
  return `${claveDelDia(fecha)}T23:59:00-03:00`;
}

export interface CamposPromocion {
  titulo: string;
  detalle: string;
  descuento: string; // texto del campo; vacío = la promo no es un descuento
  desde: Date;
  hasta: Date;
}

// Mismos límites que la API: título de 1 a 120, detalle de 1 a 2000, descuento entero de
// 1 a 100 (o vacío) y una promo que no termine antes de empezar ni ya vencida. Devuelve el
// primer problema (texto para mostrar) o null si está todo bien.
export function validarPromocion(campos: CamposPromocion, ahora: Date = new Date()): string | null {
  const titulo = campos.titulo.trim();
  const detalle = campos.detalle.trim();
  const descuento = campos.descuento.trim();

  if (titulo.length < 1 || titulo.length > 120) {
    return 'El título tiene que tener entre 1 y 120 letras.';
  }
  if (detalle.length < 1 || detalle.length > 2000) {
    return 'El detalle tiene que tener entre 1 y 2000 letras.';
  }
  if (descuento !== '') {
    const valor = Number(descuento);
    if (!/^\d+$/.test(descuento) || valor < 1 || valor > 100) {
      return 'El descuento tiene que ser un número entero de 1 a 100.';
    }
  }
  // Las claves son "AAAA-MM-DD": comparadas como texto, siguen el orden de las fechas.
  if (claveDelDia(campos.hasta) < claveDelDia(campos.desde)) {
    return 'La promoción no puede terminar antes de empezar.';
  }
  if (Date.parse(finDelDiaIso(campos.hasta)) <= ahora.getTime()) {
    return 'La promoción tiene que terminar hoy o más adelante.';
  }
  return null;
}
