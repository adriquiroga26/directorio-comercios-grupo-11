// Las preferencias de búsqueda que la app recuerda aunque se cierre: el rubro elegido y los dos
// interruptores. Lo que se guarda en el teléfono es TEXTO (JSON), y un texto guardado puede
// estar vacío, roto o venir de una versión vieja de la app: por eso `normalizarPreferencias`
// nunca confía en lo que lee y completa con valores por defecto lo que falte o no sirva.

export interface PreferenciasBusqueda {
  rubroId: string | null;
  soloAbiertos: boolean;
  masCercaPrimero: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasBusqueda = {
  rubroId: null,
  soloAbiertos: false,
  masCercaPrimero: false,
};

export function normalizarPreferencias(valor: unknown): PreferenciasBusqueda {
  if (typeof valor !== 'object' || valor === null) return PREFERENCIAS_POR_DEFECTO;
  const crudo = valor as Record<string, unknown>;

  return {
    rubroId: typeof crudo.rubroId === 'string' ? crudo.rubroId : null,
    soloAbiertos: crudo.soloAbiertos === true,
    masCercaPrimero: crudo.masCercaPrimero === true,
  };
}

// Convierte el texto guardado en preferencias. Un texto que no es JSON válido da los valores
// por defecto, sin romper la app.
export function leerPreferenciasDeTexto(texto: string | null): PreferenciasBusqueda {
  if (texto === null) return PREFERENCIAS_POR_DEFECTO;
  try {
    return normalizarPreferencias(JSON.parse(texto));
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}
