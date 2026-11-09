import {
  borrarPendiente,
  guardarPendiente,
  listarPendientes,
  marcarRechazada,
} from '@/almacen/resenasPendientes';
import { ErrorApi, pedir } from '@/servicios/cliente';
import { enviarPendientes, publicarResena } from '@/servicios/resenasPendientes';
import type { ResenaPendiente } from '@/tipos';
import { FORMATO_ID_RESENA } from '@/utilidades/resenasPendientes';

// SQLite es nativo y no corre en Jest: se reemplaza la cola por funciones de mentira para
// probar la POLÍTICA (qué se guarda, qué se envía, qué se descarta).
jest.mock('@/almacen/resenasPendientes', () => ({
  guardarPendiente: jest.fn(),
  listarPendientes: jest.fn(),
  borrarPendiente: jest.fn(),
  marcarRechazada: jest.fn(),
}));

// Se reemplaza sólo `pedir` (el que hace los pedidos a la API); ErrorApi queda el verdadero.
jest.mock('@/servicios/cliente', () => ({
  ...jest.requireActual('@/servicios/cliente'),
  pedir: jest.fn(),
}));

const mockGuardar = jest.mocked(guardarPendiente);
const mockListar = jest.mocked(listarPendientes);
const mockBorrar = jest.mocked(borrarPendiente);
const mockRechazar = jest.mocked(marcarRechazada);
const mockPedir = jest.mocked(pedir);

function errorApi(codigo: string, mensaje = 'Mensaje de la API.') {
  return new ErrorApi({ codigo, mensaje });
}

function pendiente(id: string, extra: Partial<ResenaPendiente> = {}): ResenaPendiente {
  return {
    id,
    usuarioId: 'usr-1',
    comercioId: 'com-118',
    estrellas: 4,
    comentario: 'Muy buena atención.',
    creadaEn: '2026-11-09T12:00:00.000Z',
    error: null,
    ...extra,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('publicarResena', () => {
  it('con conexión: se envía con un id propio y no queda nada en la cola', async () => {
    mockPedir.mockResolvedValue({ datos: {} as never, meta: null });

    const resultado = await publicarResena('usr-1', 'com-118', { estrellas: 5, comentario: 'Genial' });

    expect(resultado).toBe('enviada');
    const [ruta, opciones] = mockPedir.mock.calls[0];
    expect(ruta).toBe('/comercios/com-118/resenas');
    expect(opciones).toMatchObject({ metodo: 'POST', cuerpo: { estrellas: 5, comentario: 'Genial' } });
    expect((opciones?.cuerpo as { id: string }).id).toMatch(FORMATO_ID_RESENA);
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('sin conexión: se guarda en la cola con el MISMO id con el que se intentó enviar', async () => {
    mockPedir.mockRejectedValue(errorApi('SIN_CONEXION'));
    mockGuardar.mockResolvedValue(undefined);

    const resultado = await publicarResena('usr-1', 'com-118', { estrellas: 3, comentario: 'Bien' });

    expect(resultado).toBe('pendiente');
    const idEnviado = (mockPedir.mock.calls[0][1]?.cuerpo as { id: string }).id;
    expect(mockGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: idEnviado,
        usuarioId: 'usr-1',
        comercioId: 'com-118',
        estrellas: 3,
        comentario: 'Bien',
        error: null,
      }),
    );
  });

  it('con el servidor caído (error 500) también queda pendiente', async () => {
    mockPedir.mockRejectedValue(errorApi('ERROR_INTERNO'));
    mockGuardar.mockResolvedValue(undefined);
    expect(await publicarResena('usr-1', 'com-118', { estrellas: 3, comentario: 'Bien' })).toBe('pendiente');
  });

  it('una respuesta clara de la API (ya dejó reseña) NO se guarda: se muestra el error', async () => {
    mockPedir.mockRejectedValue(errorApi('RESENA_YA_EXISTE'));

    await expect(
      publicarResena('usr-1', 'com-118', { estrellas: 3, comentario: 'Bien' }),
    ).rejects.toMatchObject({ codigo: 'RESENA_YA_EXISTE' });
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('sin conexión y sin poder guardar: se muestra el problema de conexión', async () => {
    mockPedir.mockRejectedValue(errorApi('SIN_CONEXION'));
    mockGuardar.mockRejectedValue(new Error('la base no abre'));

    await expect(
      publicarResena('usr-1', 'com-118', { estrellas: 3, comentario: 'Bien' }),
    ).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
  });
});

describe('enviarPendientes', () => {
  it('envía cada pendiente con su id y su fecha, y la borra de la cola', async () => {
    mockListar.mockResolvedValue([pendiente('res-a'), pendiente('res-b')]);
    mockPedir.mockResolvedValue({ datos: {} as never, meta: null });

    const resumen = await enviarPendientes('usr-1');

    expect(resumen).toEqual({ enviadas: 2, rechazadas: 0 });
    expect(mockPedir.mock.calls[0][1]?.cuerpo).toMatchObject({
      id: 'res-a',
      creadaEn: '2026-11-09T12:00:00.000Z',
    });
    expect(mockBorrar).toHaveBeenCalledWith('res-a');
    expect(mockBorrar).toHaveBeenCalledWith('res-b');
  });

  it('sin conexión: corta, no borra nada y no marca nada como rechazada', async () => {
    mockListar.mockResolvedValue([pendiente('res-a'), pendiente('res-b')]);
    mockPedir.mockRejectedValue(errorApi('SIN_CONEXION'));

    const resumen = await enviarPendientes('usr-1');

    expect(resumen).toEqual({ enviadas: 0, rechazadas: 0 });
    expect(mockPedir).toHaveBeenCalledTimes(1); // no insiste con la segunda
    expect(mockBorrar).not.toHaveBeenCalled();
    expect(mockRechazar).not.toHaveBeenCalled();
  });

  it('la API la rechaza para siempre: se marca con el motivo y se sigue con la siguiente', async () => {
    mockListar.mockResolvedValue([pendiente('res-a'), pendiente('res-b')]);
    mockPedir
      .mockRejectedValueOnce(errorApi('RESENA_YA_EXISTE', 'Ya dejaste una reseña para este comercio.'))
      .mockResolvedValueOnce({ datos: {} as never, meta: null });

    const resumen = await enviarPendientes('usr-1');

    expect(resumen).toEqual({ enviadas: 1, rechazadas: 1 });
    expect(mockRechazar).toHaveBeenCalledWith('res-a', 'Ya dejaste una reseña para este comercio.');
    expect(mockBorrar).toHaveBeenCalledWith('res-b');
    expect(mockBorrar).not.toHaveBeenCalledWith('res-a');
  });

  it('las ya rechazadas no se vuelven a enviar', async () => {
    mockListar.mockResolvedValue([pendiente('res-a', { error: 'Ya dejaste una reseña.' })]);

    expect(await enviarPendientes('usr-1')).toEqual({ enviadas: 0, rechazadas: 0 });
    expect(mockPedir).not.toHaveBeenCalled();
  });

  it('con la fecha en el futuro (reloj adelantado): reenvía sin fecha y sale bien', async () => {
    mockListar.mockResolvedValue([pendiente('res-a')]);
    mockPedir
      .mockRejectedValueOnce(errorApi('FECHA_EN_EL_FUTURO'))
      .mockResolvedValueOnce({ datos: {} as never, meta: null });

    expect(await enviarPendientes('usr-1')).toEqual({ enviadas: 1, rechazadas: 0 });
    expect(mockPedir.mock.calls[0][1]?.cuerpo).toHaveProperty('creadaEn');
    expect(mockPedir.mock.calls[1][1]?.cuerpo).not.toHaveProperty('creadaEn');
    expect(mockBorrar).toHaveBeenCalledWith('res-a');
  });

  it('con la sesión vencida: corta y la deja para más tarde', async () => {
    mockListar.mockResolvedValue([pendiente('res-a')]);
    mockPedir.mockRejectedValue(errorApi('NO_AUTENTICADO'));

    expect(await enviarPendientes('usr-1')).toEqual({ enviadas: 0, rechazadas: 0 });
    expect(mockBorrar).not.toHaveBeenCalled();
    expect(mockRechazar).not.toHaveBeenCalled();
  });
});
