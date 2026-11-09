import type { Comercio, Coordenadas } from '@/tipos';

// La API NO devuelve la distancia a cada comercio (sólo sabe filtrar y ordenar). Por eso se
// calcula acá con la posición del teléfono. Son funciones puras: reciben todo por parámetro.

const RADIO_TIERRA_METROS = 6_371_000;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

// Fórmula de haversine: la distancia en línea recta, sobre la superficie de la Tierra, entre
// dos puntos dados por latitud y longitud. No es el camino a pie (que depende de las calles),
// pero para "a 450 m" alcanza.
export function distanciaEnMetros(a: Coordenadas, b: Coordenadas): number {
  const difLatitud = aRadianes(b.latitud - a.latitud);
  const difLongitud = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(difLatitud / 2) ** 2 +
    Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(difLongitud / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(h));
}

// "a 450 m", "a 1,2 km", "a 15 km" (con coma decimal, como se escribe en Argentina).
export function textoDistancia(metros: number): string {
  if (metros < 1000) {
    // De a 10 metros: dar el metro exacto sería una precisión que el GPS no tiene.
    const redondeado = Math.max(10, Math.round(metros / 10) * 10);
    return redondeado >= 1000 ? 'a 1,0 km' : `a ${redondeado} m`;
  }
  if (metros < 10_000) {
    return `a ${(metros / 1000).toFixed(1).replace('.', ',')} km`;
  }
  return `a ${Math.round(metros / 1000)} km`;
}

// La distancia de cada comercio a la posición dada, por id.
export function distanciasDesde(posicion: Coordenadas, comercios: Comercio[]): Map<string, number> {
  return new Map(comercios.map((c) => [c.id, distanciaEnMetros(posicion, c.coordenadas)]));
}

// Una copia ordenada del más cerca al más lejos. Si algún comercio no tiene distancia, va al final.
export function ordenarPorDistancia(
  comercios: Comercio[],
  distancias: Map<string, number>,
): Comercio[] {
  return [...comercios].sort(
    (a, b) =>
      (distancias.get(a.id) ?? Number.POSITIVE_INFINITY) -
      (distancias.get(b.id) ?? Number.POSITIVE_INFINITY),
  );
}
