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
export const URL_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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

// Token de la sesión. Lo guarda acá la sesión (src/sesion) apenas el usuario
// ingresa, y desde ese momento viaja solo en cada pedido.
let token: string | null = null;

export function setToken(valor: string | null) {
  token = valor;
}

// Función que se llama cuando la API dice que la sesión ya no sirve (token vencido
// o inválido). La registra la sesión para cerrarla y volver al ingreso.
let alVencerLaSesion: (() => void) | null = null;

export function setAlVencerLaSesion(funcion: (() => void) | null) {
  alVencerLaSesion = funcion;
}

function cabeceras(conCuerpo: boolean): Record<string, string> {
  const resultado: Record<string, string> = { Accept: 'application/json' };
  if (conCuerpo) resultado['Content-Type'] = 'application/json';
  // La sesión viaja en la cabecera Authorization: Bearer <token> (lo pide el PRD).
  if (token) resultado.Authorization = `Bearer ${token}`;
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

// Las cabeceras de la sesión, para los pedidos que no pasan por `pedir` (como subir un
// archivo, que no se manda como JSON).
export function cabecerasDeSesion(): Record<string, string> {
  const resultado: Record<string, string> = { Accept: 'application/json' };
  if (token) resultado.Authorization = `Bearer ${token}`;
  return resultado;
}

// Convierte el cuerpo de una respuesta fallida en el ErrorApi que corresponde. Si la API dice
// que la sesión ya no vale, además la cierra. Lo usan `pedir` y la subida de archivos.
export function errorDeRespuesta(cuerpoRespuesta: unknown): ErrorApi {
  if (esRespuestaError(cuerpoRespuesta)) {
    // Con una sesión iniciada, NO_AUTENTICADO significa que el token ya no vale.
    if (cuerpoRespuesta.error.codigo === 'NO_AUTENTICADO' && token) alVencerLaSesion?.();
    return new ErrorApi(cuerpoRespuesta.error);
  }
  return new ErrorApi({
    codigo: 'ERROR_INTERNO',
    mensaje: 'Algo salió mal. Probá de nuevo en un rato.',
  });
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  cuerpo?: unknown; // se manda como JSON
}

// Pedido a la API. Devuelve el sobre { datos, meta } o lanza ErrorApi.
// Los servicios (comercios.ts, cuenta.ts, ...) usan esto y nada más.
export async function pedir<T>(
  ruta: string,
  { metodo = 'GET', cuerpo }: Opciones = {},
): Promise<RespuestaExito<T>> {
  const conCuerpo = cuerpo !== undefined;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: metodo,
      headers: cabeceras(conCuerpo),
      body: conCuerpo ? JSON.stringify(cuerpo) : undefined,
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

  // Un 204 ("sin contenido") es lo que responde la API al borrar algo: llega sin
  // cuerpo, así que no hay JSON que leer. Se devuelve `datos: null`.
  if (respuesta.status === 204) {
    return { datos: null as unknown as T, meta: null };
  }

  let cuerpoRespuesta: unknown;
  try {
    cuerpoRespuesta = await respuesta.json();
  } catch {
    throw new ErrorApi({
      codigo: 'RESPUESTA_INVALIDA',
      mensaje: 'No pudimos leer la respuesta del servidor. Probá de nuevo en un rato.',
    });
  }

  // fetch NO lanza error ante un 404 o un 500: hay que mirar response.ok.
  if (!respuesta.ok) {
    throw errorDeRespuesta(cuerpoRespuesta);
  }

  return cuerpoRespuesta as RespuestaExito<T>;
}
