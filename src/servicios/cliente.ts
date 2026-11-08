import type { CuerpoError, RespuestaError, RespuestaExito } from '@/tipos';

// Error que lanzan todos los servicios. Se arma a partir de la respuesta de error
// de la API ({ "error": { "codigo", "mensaje" } }) o de una falla de conexión.
// El `mensaje` está pensado para mostrarlo tal cual en pantalla.
export class ErrorApi extends Error {
  codigo: string;

  constructor({ codigo, mensaje }: CuerpoError) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
  }
}

// Dirección de la API. Expo reemplaza process.env.EXPO_PUBLIC_* por su valor al
// armar la app (sólo las variables con ese prefijo llegan al código). Se define
// en .env.local; si falta, se usa localhost (sirve para la web, no para el celular).
const URL_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// fetch no tiene tiempo máximo propio: sin esto, una dirección que no responde
// dejaría la pantalla cargando para siempre.
const TIEMPO_MAXIMO_MS = 10_000;

// Sólo para desarrollo: la API acepta la cabecera X-Simular para probar un error
// del servidor o una respuesta lenta sin apagar el wifi.
export type Simulacion = 'normal' | 'error' | 'demora';

let simulacion: Simulacion = 'normal';

export function setSimulacion(valor: Simulacion) {
  simulacion = valor;
}

function cabeceras(): Record<string, string> {
  const resultado: Record<string, string> = { Accept: 'application/json' };
  if (__DEV__ && simulacion === 'error') resultado['X-Simular'] = 'error-500';
  if (__DEV__ && simulacion === 'demora') resultado['X-Simular'] = 'demora-3000';
  return resultado;
}

// La API siempre responde con { datos, meta } o con { error: { codigo, mensaje } }.
// Esta función comprueba la forma antes de confiar en ella.
function esRespuestaError(cuerpo: unknown): cuerpo is RespuestaError {
  if (typeof cuerpo !== 'object' || cuerpo === null || !('error' in cuerpo)) return false;
  const { error } = cuerpo;
  return (
    typeof error === 'object' &&
    error !== null &&
    'codigo' in error &&
    typeof error.codigo === 'string' &&
    'mensaje' in error &&
    typeof error.mensaje === 'string'
  );
}

// GET a la API. Devuelve el sobre { datos, meta } o lanza ErrorApi.
// Los servicios (comercios.ts, promociones.ts, ...) usan esto y nada más.
export async function pedir<T>(ruta: string): Promise<RespuestaExito<T>> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      headers: cabeceras(),
      signal: controlador.signal,
    });
  } catch {
    // Sin red, dirección incorrecta o tiempo agotado: todo es "no pudimos conectarnos".
    throw new ErrorApi({
      codigo: 'SIN_CONEXION',
      mensaje: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
    });
  } finally {
    clearTimeout(temporizador);
  }

  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new ErrorApi({
      codigo: 'RESPUESTA_INVALIDA',
      mensaje: 'No pudimos leer la respuesta del servidor. Probá de nuevo en un rato.',
    });
  }

  // fetch NO lanza error ante un 404 o un 500: hay que mirar response.ok.
  if (!respuesta.ok) {
    if (esRespuestaError(cuerpo)) throw new ErrorApi(cuerpo.error);
    throw new ErrorApi({
      codigo: 'ERROR_INTERNO',
      mensaje: 'Algo salió mal. Probá de nuevo en un rato.',
    });
  }

  return cuerpo as RespuestaExito<T>;
}
