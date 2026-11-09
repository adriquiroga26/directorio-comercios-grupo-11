import Storage from 'expo-sqlite/kv-store';

import { idsDeTexto } from '@/utilidades/avisos';

// Los avisos de promo que ya se programaron para una cuenta, en el kv-store. Sirve para que un aviso
// que ya llegó no se vuelva a programar cada vez que se abre la app. Cada cuenta tiene su lista (si
// dos personas usan el mismo teléfono, no se mezclan).
const clave = (usuarioId: string) => `avisos.avisadas.${usuarioId}`;

export function leerYaAvisadas(usuarioId: string): Set<string> {
  try {
    return idsDeTexto(Storage.getItemSync(clave(usuarioId)));
  } catch {
    return new Set();
  }
}

export function guardarYaAvisadas(usuarioId: string, ids: Set<string>): void {
  try {
    Storage.setItemSync(clave(usuarioId), JSON.stringify([...ids]));
  } catch {
    // Si no se puede guardar, lo peor que pasa es repetir un aviso.
  }
}
