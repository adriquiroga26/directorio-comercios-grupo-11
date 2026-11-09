// La lógica de las fotos de los comercios guardadas en el teléfono, sin tocar archivos: qué
// nombre lleva cada foto, cuáles hay que descargar y cuáles borrar. Son funciones puras para
// poder probarlas; las operaciones con archivos están en src/almacen/fotos.ts.

// El nombre del archivo local sale de la dirección de la foto, pero SIN el servidor: la API arma
// las direcciones con la IP que usó el teléfono ("http://192.168.1.7:3000/archivos/...") y esa
// IP puede cambiar. Lo que identifica a la foto es lo que sigue a "/archivos/".
//   http://192.168.1.7:3000/archivos/imagenes/2026/11/ab12.png  ->  imagenes_2026_11_ab12.png
export function nombreDeArchivoLocal(url: string): string {
  const marca = '/archivos/';
  const posicion = url.indexOf(marca);
  const camino = posicion >= 0 ? url.slice(posicion + marca.length) : url;
  // Sin parámetros de la dirección (?...) y con sólo caracteres seguros para un nombre de archivo.
  return camino.replace(/[?#].*$/, '').replace(/[^A-Za-z0-9._-]/g, '_');
}

// Todas las fotos de los comercios, sin repetir (varios comercios pueden usar la misma).
export function urlsDeFotos(comercios: { imagenes: string[] }[]): string[] {
  return [...new Set(comercios.flatMap((comercio) => comercio.imagenes))];
}

export interface PlanDeFotos {
  descargar: { url: string; nombre: string }[];
  borrar: string[]; // nombres de archivos guardados que ya ningún comercio usa
}

// Compara lo que hace falta (las fotos de los comercios) con lo que ya hay guardado.
export function planificarFotos(urls: string[], nombresGuardados: string[]): PlanDeFotos {
  const necesarios = new Map(urls.map((url) => [nombreDeArchivoLocal(url), url]));
  const guardados = new Set(nombresGuardados);

  return {
    descargar: [...necesarios]
      .filter(([nombre]) => !guardados.has(nombre))
      .map(([nombre, url]) => ({ url, nombre })),
    borrar: nombresGuardados.filter((nombre) => !necesarios.has(nombre)),
  };
}

// "512 B", "2 KB", "3,4 MB" o "12,8 GB" (con coma decimal, como se escribe en Argentina).
export function textoTamano(bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const conComa = (valor: number) => valor.toFixed(1).replace('.', ',');

  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  if (bytes < GB) return `${conComa(bytes / MB)} MB`;
  return `${conComa(bytes / GB)} GB`;
}
