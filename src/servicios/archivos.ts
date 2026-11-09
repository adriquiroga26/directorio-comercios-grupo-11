import { File, UploadType } from 'expo-file-system';

import type { ArchivoSubido } from '@/tipos';

import { cabecerasDeSesion, ErrorApi, errorDeRespuesta, URL_BASE } from './cliente';

interface OpcionesSubida {
  // El tipo del archivo (por ejemplo "image/jpeg"). La API igual lo reconoce por el contenido.
  mimeType?: string;
  // Avisa cuánto se subió, de 0 a 1, para mostrar una barra de progreso.
  alAvanzar?: (progreso: number) => void;
}

// Sube una foto o un video a POST /archivos y devuelve su dirección (`url`); esa dirección se
// manda después en el recurso. Usa la API nueva de expo-file-system: un `File` hecho con la
// ruta del archivo en el teléfono sabe subirse solo, en formato multipart, con el nombre de
// campo `archivo` que pide la API.
// Errores posibles (con mensaje para mostrar): ARCHIVO_DEMASIADO_GRANDE (fotos hasta 5 MB,
// videos hasta 30 MB), TIPO_DE_ARCHIVO_NO_PERMITIDO (JPG, PNG, WEBP o MP4) y SIN_CONEXION.
export async function subirArchivo(
  uri: string,
  { mimeType, alAvanzar }: OpcionesSubida = {},
): Promise<ArchivoSubido> {
  const archivo = new File(uri);

  let resultado;
  try {
    resultado = await archivo.upload(`${URL_BASE}/archivos`, {
      uploadType: UploadType.MULTIPART,
      fieldName: 'archivo',
      mimeType,
      headers: cabecerasDeSesion(),
      onProgress: ({ bytesSent, totalBytes }) => {
        if (totalBytes > 0) alAvanzar?.(Math.min(bytesSent / totalBytes, 1));
      },
    });
  } catch {
    // upload sólo falla si no se pudo leer el archivo o si no hubo conexión.
    throw new ErrorApi({
      codigo: 'SIN_CONEXION',
      mensaje: 'No pudimos subir el archivo. Revisá tu conexión e intentá de nuevo.',
    });
  }

  // A diferencia de fetch, upload entrega el cuerpo como texto, incluso si falló.
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(resultado.body);
  } catch {
    throw new ErrorApi({
      codigo: 'RESPUESTA_INVALIDA',
      mensaje: 'No pudimos leer la respuesta del servidor. Probá de nuevo en un rato.',
    });
  }

  // La API responde 201 al guardar el archivo.
  if (resultado.status < 200 || resultado.status >= 300) {
    throw errorDeRespuesta(cuerpo);
  }
  return (cuerpo as { datos: ArchivoSubido }).datos;
}
