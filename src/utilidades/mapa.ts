import type { Coordenadas } from '@/tipos';

// La "región" es lo que muestra el mapa: un punto central y cuánto abarca hacia el norte y
// hacia el este (en grados). Es el formato que usa react-native-maps. Son funciones puras.
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Lo que se muestra si todavía no hay comercios que ubicar: el centro de Concepción del
// Uruguay, donde están los comercios de la API de la cátedra.
export const REGION_POR_DEFECTO: Region = {
  latitude: -32.4825,
  longitude: -58.2372,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Con un solo comercio (o varios pegados) el rectángulo sería casi un punto y el mapa quedaría
// con un zoom exagerado: se pide un mínimo (unos 600 m).
const ABARQUE_MINIMO = 0.006;

// La región que deja ver todos los puntos dados, con un poco de aire alrededor (`margen` 1,4 =
// 40 % más grande que el rectángulo justo).
export function regionQueAbarca(puntos: Coordenadas[], margen = 1.4): Region {
  if (puntos.length === 0) return REGION_POR_DEFECTO;

  const latitudes = puntos.map((p) => p.latitud);
  const longitudes = puntos.map((p) => p.longitud);
  const minLatitud = Math.min(...latitudes);
  const maxLatitud = Math.max(...latitudes);
  const minLongitud = Math.min(...longitudes);
  const maxLongitud = Math.max(...longitudes);

  return {
    latitude: (minLatitud + maxLatitud) / 2,
    longitude: (minLongitud + maxLongitud) / 2,
    latitudeDelta: Math.max((maxLatitud - minLatitud) * margen, ABARQUE_MINIMO),
    longitudeDelta: Math.max((maxLongitud - minLongitud) * margen, ABARQUE_MINIMO),
  };
}

// La región centrada en la persona, con un zoom de barrio (unos 1,1 km de alto).
export function regionAlrededorDe(posicion: Coordenadas): Region {
  return {
    latitude: posicion.latitud,
    longitude: posicion.longitud,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}
