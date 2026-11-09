import { Directory, File, Paths } from 'expo-file-system';

import {
  nombreDeArchivoLocal,
  planificarFotos,
  urlsDeFotos,
} from '@/utilidades/fotosLocales';

// Las fotos de los comercios guardadas EN el teléfono, para verlas sin conexión y sin gastar
// datos. Usa la API nueva de expo-file-system, que trabaja con objetos:
//   - Paths      dice dónde están las carpetas de la app (Paths.document es la carpeta de
//                documentos de la app: el sistema no la borra por su cuenta).
//   - Directory  una carpeta (existe, se crea, lista lo que tiene, se borra).
//   - File       un archivo (existe, pesa, se descarga, se borra).
// Todo es de "mejor esfuerzo": si algo falla, la app sigue mostrando las fotos desde la red.

const NOMBRE_DE_LA_CARPETA = 'fotos';
const DESCARGAS_A_LA_VEZ = 4;

// Se arma cada vez (no se guarda): crear un Directory no toca el disco, sólo apunta a la ruta.
function carpetaDeFotos(): Directory {
  return new Directory(Paths.document, NOMBRE_DE_LA_CARPETA);
}

// Los archivos guardados (sin las subcarpetas, que no debería haber).
function archivosGuardados(carpeta: Directory): File[] {
  return carpeta.list().filter((elemento): elemento is File => elemento instanceof File);
}

// La dirección que hay que usar para mostrar una foto: la copia del teléfono si existe (se ve
// sin conexión y carga al instante) y, si no, la de la red. Es síncrona a propósito: se llama
// mientras se dibuja la pantalla.
export function fuenteDeFoto(url: string): { uri: string } {
  try {
    const archivo = new File(carpetaDeFotos(), nombreDeArchivoLocal(url));
    if (archivo.exists) return { uri: archivo.uri };
  } catch {
    // Si no se puede mirar el disco, se usa la de la red.
  }
  return { uri: url };
}

// Descarga la foto en un archivo. Si la descarga se corta, el archivo a medias se borra: una foto
// incompleta guardada como si estuviera bien se vería rota para siempre.
async function descargar(url: string, destino: File): Promise<void> {
  try {
    await File.downloadFileAsync(url, destino, { idempotent: true });
  } catch {
    try {
      if (destino.exists) destino.delete();
    } catch {
      // No hay nada más que hacer con ese archivo.
    }
  }
}

// Reparte las descargas entre unos pocos "trabajadores" que toman la siguiente de la fila, así
// nunca hay más de DESCARGAS_A_LA_VEZ en camino (con 640 comercios no se piden todas juntas).
async function descargarDeAPoco(
  pendientes: { url: string; nombre: string }[],
  carpeta: Directory,
): Promise<void> {
  const fila = [...pendientes];
  const trabajador = async () => {
    for (let siguiente = fila.shift(); siguiente !== undefined; siguiente = fila.shift()) {
      await descargar(siguiente.url, new File(carpeta, siguiente.nombre));
    }
  };
  await Promise.all(Array.from({ length: DESCARGAS_A_LA_VEZ }, trabajador));
}

// Un solo trabajo a la vez: si el directorio se recarga mientras todavía se está descargando,
// no se arranca otro igual encima.
let sincronizando = false;

// Deja guardadas las fotos de estos comercios: baja las que faltan y borra las que ya ninguno usa.
export async function sincronizarFotos(comercios: { imagenes: string[] }[]): Promise<void> {
  if (sincronizando) return;
  sincronizando = true;
  try {
    const carpeta = carpetaDeFotos();
    if (!carpeta.exists) carpeta.create({ intermediates: true, idempotent: true });

    const plan = planificarFotos(
      urlsDeFotos(comercios),
      archivosGuardados(carpeta).map((archivo) => archivo.name),
    );

    for (const nombre of plan.borrar) {
      try {
        new File(carpeta, nombre).delete();
      } catch {
        // Se vuelve a intentar la próxima vez.
      }
    }
    await descargarDeAPoco(plan.descargar, carpeta);
  } finally {
    sincronizando = false;
  }
}

export interface ResumenDeFotos {
  cantidad: number;
  bytes: number; // lo que ocupan en el teléfono
  libres: number; // espacio libre en el teléfono
}

// Cuántas fotos hay guardadas, cuánto pesan y cuánto espacio libre queda (Paths.availableDiskSpace).
// Es `async` sólo para que las pantallas la usen igual que el resto de las lecturas.
export async function resumenDeFotos(): Promise<ResumenDeFotos> {
  const carpeta = carpetaDeFotos();
  const archivos = carpeta.exists ? archivosGuardados(carpeta) : [];
  return {
    cantidad: archivos.length,
    bytes: archivos.reduce((total, archivo) => total + (archivo.size ?? 0), 0),
    libres: Paths.availableDiskSpace,
  };
}

// Borra todas las fotos guardadas (la carpeta entera). Se vuelven a bajar la próxima vez que el
// directorio se actualice con conexión.
export async function borrarFotosGuardadas(): Promise<void> {
  const carpeta = carpetaDeFotos();
  if (carpeta.exists) carpeta.delete();
}
