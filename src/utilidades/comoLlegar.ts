import type { Coordenadas } from '@/tipos';

// "Cómo llegar": las direcciones que abren la app de mapas del teléfono con la ruta hasta el
// comercio. No se le pasa el punto de partida: la app de mapas usa donde está la persona.
// Es una función pura: recibe la plataforma por parámetro para poder probarla.

export type ModoDeViaje = 'a-pie' | 'en-auto';

// Las direcciones a probar, en orden: la primera abre directo la app de mapas del sistema y,
// si el teléfono no la tiene, se prueba la siguiente (la página web de Google Maps, que abre
// la app si está instalada o el navegador si no).
export function urlsParaLlegar(
  destino: Coordenadas,
  modo: ModoDeViaje,
  plataforma: string,
): string[] {
  const punto = `${destino.latitud},${destino.longitud}`;
  const caminando = modo === 'a-pie';

  // La página web de Google Maps funciona en cualquier teléfono.
  const web = `https://www.google.com/maps/dir/?api=1&destination=${punto}&travelmode=${
    caminando ? 'walking' : 'driving'
  }`;

  if (plataforma === 'ios') {
    // Apple Maps: `dirflg` es el medio de transporte (w = a pie, d = en auto).
    return [`https://maps.apple.com/?daddr=${punto}&dirflg=${caminando ? 'w' : 'd'}`];
  }
  if (plataforma === 'android') {
    // Esquema de Google Maps para Android que arranca la navegación (w = a pie, d = en auto).
    return [`google.navigation:q=${punto}&mode=${caminando ? 'w' : 'd'}`, web];
  }
  return [web];
}
