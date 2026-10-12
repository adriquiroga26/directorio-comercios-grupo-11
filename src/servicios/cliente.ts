import type { CuerpoError, Meta } from '@/tipos';

// Error que lanzan todos los servicios. Cuando llegue la API real, se arma
// a partir de { "error": { "codigo", "mensaje" } } sin cambiar a quien lo captura.
export class ErrorApi extends Error {
  codigo: string;

  constructor({ codigo, mensaje }: CuerpoError) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
  }
}

// Sólo para desarrollo con mocks: permite ver en pantalla los estados
// "lista vacía" y "error de red". Se elimina cuando llegue la API.
export type ModoMock = 'normal' | 'vacio' | 'error';

let modoMock: ModoMock = 'normal';

export function setModoMock(modo: ModoMock) {
  modoMock = modo;
}

export function getModoMock(): ModoMock {
  return modoMock;
}

const LATENCIA_MS = 400;

// Simula la red: espera un poco y respeta el modo mock.
// `datos` se calcula recién después de la espera, igual que un fetch.
export async function respuestaMock<T>(
  obtenerDatos: () => T,
  vacio: T,
): Promise<{ datos: T; meta?: Meta }> {
  await new Promise((resolver) => setTimeout(resolver, LATENCIA_MS));

  if (modoMock === 'error') {
    throw new ErrorApi({
      codigo: 'SIN_CONEXION',
      mensaje: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
    });
  }

  const datos = modoMock === 'vacio' ? vacio : obtenerDatos();
  return { datos };
}
