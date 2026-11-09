// Reglas de las fotos y el video del comercio. Son las de la API (POST /archivos y
// PATCH /mi-comercio): se revisan acá primero para avisar antes de gastar datos subiendo un
// archivo que la API va a rechazar.

const MB = 1024 * 1024;

export const MAXIMO_FOTOS = 8;
export const MAX_BYTES_FOTO = 5 * MB;
export const MAX_BYTES_VIDEO = 30 * MB;

export type TipoMultimedia = 'imagen' | 'video';

// "4,3 MB" (con coma decimal, como se escribe en Argentina).
export function enMegas(bytes: number): string {
  return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`;
}

// Devuelve el problema (texto para mostrar) o null si el archivo entra. Si no se sabe cuánto
// pesa (`null`), no se puede juzgar: se deja pasar y la API decide.
export function validarTamano(tipo: TipoMultimedia, bytes: number | null): string | null {
  if (bytes === null) return null;
  const maximo = tipo === 'imagen' ? MAX_BYTES_FOTO : MAX_BYTES_VIDEO;
  if (bytes > maximo) {
    const queEs = tipo === 'imagen' ? 'La foto' : 'El video';
    return `${queEs} pesa ${enMegas(bytes)} y el máximo es ${enMegas(maximo)}.`;
  }
  return null;
}

// Las fotos nuevas van al final. Una dirección repetida no se agrega dos veces.
export function agregarFoto(fotos: string[], url: string): string[] {
  return fotos.includes(url) ? fotos : [...fotos, url];
}

export function quitarFoto(fotos: string[], url: string): string[] {
  return fotos.filter((foto) => foto !== url);
}
