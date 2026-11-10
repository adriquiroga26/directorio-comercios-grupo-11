import Storage from 'expo-sqlite/kv-store';

import { idsDeTexto } from '@/utilidades/avisos';

// Lo que la app recuerda para los avisos de promociones, en el kv-store. Cada cuenta tiene sus listas
// (si dos personas usan el mismo teléfono, no se mezclan).

// Los avisos de promo que ya se programaron para una cuenta. Sirve para que un aviso que ya llegó no
// se vuelva a programar cada vez que se abre la app.
const claveAvisadas = (usuarioId: string) => `avisos.avisadas.${usuarioId}`;

export function leerYaAvisadas(usuarioId: string): Set<string> {
  try {
    return idsDeTexto(Storage.getItemSync(claveAvisadas(usuarioId)));
  } catch {
    return new Set();
  }
}

export function guardarYaAvisadas(usuarioId: string, ids: Set<string>): void {
  try {
    Storage.setItemSync(claveAvisadas(usuarioId), JSON.stringify([...ids]));
  } catch {
    // Si no se puede guardar, lo peor que pasa es repetir un aviso.
  }
}

// Las promociones que la app ya conocía la última vez que miró. Una promoción de interés que no
// está en esta lista es una promoción NUEVA. `null` significa que es la primera vez de esta cuenta
// (todavía no se guardó nada): en ese caso no se avisa de lo que ya existe.
const claveVistas = (usuarioId: string) => `avisos.vistas.${usuarioId}`;

export function leerVistas(usuarioId: string): Set<string> | null {
  try {
    const texto = Storage.getItemSync(claveVistas(usuarioId));
    return texto === null ? null : idsDeTexto(texto);
  } catch {
    // Si el almacén falla, se actúa como "primera vez": mejor no avisar de más.
    return null;
  }
}

export function guardarVistas(usuarioId: string, ids: Set<string>): void {
  try {
    Storage.setItemSync(claveVistas(usuarioId), JSON.stringify([...ids]));
  } catch {
    // Si no se puede guardar, la próxima vez se vuelve a empezar de cero (sin avisar de lo existente).
  }
}
