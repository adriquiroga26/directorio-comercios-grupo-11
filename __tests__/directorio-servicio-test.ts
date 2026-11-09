import { guardarDirectorio, leerComercioGuardado, leerDirectorio } from '@/almacen/directorio';
import { sincronizarFotos } from '@/almacen/fotos';
import { ErrorApi, pedir } from '@/servicios/cliente';
import { obtenerComercio } from '@/servicios/comercios';
import { cargarDirectorio } from '@/servicios/directorio';
import type { Comercio, Rubro } from '@/tipos';

// SQLite es nativo y no corre en Jest: se reemplaza el almacén por funciones de mentira para
// probar la POLÍTICA de respaldo (cuándo se usa la API y cuándo lo guardado en el teléfono).
jest.mock('@/almacen/directorio', () => ({
  guardarDirectorio: jest.fn(),
  leerDirectorio: jest.fn(),
  leerComercioGuardado: jest.fn(),
}));

// Las fotos usan expo-file-system (nativo): también se reemplazan.
jest.mock('@/almacen/fotos', () => ({ sincronizarFotos: jest.fn() }));

// Se reemplaza sólo `pedir` (el que hace los pedidos a la API); ErrorApi queda el verdadero.
jest.mock('@/servicios/cliente', () => ({
  ...jest.requireActual('@/servicios/cliente'),
  pedir: jest.fn(),
}));

const mockGuardar = jest.mocked(guardarDirectorio);
const mockLeer = jest.mocked(leerDirectorio);
const mockLeerComercio = jest.mocked(leerComercioGuardado);
const mockPedir = jest.mocked(pedir);
const mockFotos = jest.mocked(sincronizarFotos);

const comercioNuevo = { id: 'com-1', nombre: 'Nuevo' } as Comercio;
const comercioViejo = { id: 'com-1', nombre: 'Viejo' } as Comercio;
const rubro = { id: 'rub-1', nombre: 'Hogar' } as Rubro;

function sinConexion() {
  return new ErrorApi({ codigo: 'SIN_CONEXION', mensaje: 'No pudimos conectarnos.' });
}

// La API responde bien: comercios en /comercios y rubros en /rubros.
function apiResponde() {
  mockPedir.mockImplementation(async (ruta: string) => ({
    datos: (ruta.startsWith('/comercios') ? [comercioNuevo] : [rubro]) as never,
    meta: null,
  }));
}

beforeEach(() => {
  jest.resetAllMocks();
  // sincronizarFotos es `async`: siempre devuelve una promesa (que acá sale bien por defecto).
  mockFotos.mockResolvedValue(undefined);
});

describe('cargarDirectorio', () => {
  it('con la API andando: devuelve lo nuevo y lo guarda en el teléfono', async () => {
    apiResponde();
    mockGuardar.mockResolvedValue('2026-11-09T15:00:00.000Z');

    const directorio = await cargarDirectorio();

    expect(directorio).toEqual({
      comercios: [comercioNuevo],
      rubros: [rubro],
      desdeGuardado: false,
      actualizadoEn: '2026-11-09T15:00:00.000Z',
    });
    expect(mockGuardar).toHaveBeenCalledWith([comercioNuevo], [rubro]);
  });

  it('con la API andando: baja las fotos en segundo plano, y si fallan no afecta', async () => {
    apiResponde();
    mockGuardar.mockResolvedValue('2026-11-09T15:00:00.000Z');
    mockFotos.mockRejectedValue(new Error('sin espacio'));

    const directorio = await cargarDirectorio();

    expect(directorio.desdeGuardado).toBe(false);
    expect(mockFotos).toHaveBeenCalledWith([comercioNuevo]);
  });

  it('sin conexión: no intenta bajar fotos', async () => {
    mockPedir.mockRejectedValue(sinConexion());
    mockLeer.mockResolvedValue({ comercios: [comercioViejo], rubros: [rubro], actualizadoEn: null });

    await cargarDirectorio();

    expect(mockFotos).not.toHaveBeenCalled();
  });

  it('con la API andando pero sin poder guardar: igual devuelve lo nuevo', async () => {
    apiResponde();
    mockGuardar.mockRejectedValue(new Error('la base no abre'));

    const directorio = await cargarDirectorio();

    expect(directorio.comercios).toEqual([comercioNuevo]);
    expect(directorio.desdeGuardado).toBe(false);
    expect(directorio.actualizadoEn).not.toBeNull();
  });

  it('sin conexión y con datos guardados: devuelve lo guardado y lo marca como tal', async () => {
    mockPedir.mockRejectedValue(sinConexion());
    mockLeer.mockResolvedValue({
      comercios: [comercioViejo],
      rubros: [rubro],
      actualizadoEn: '2026-11-05T09:12:00.000Z',
    });

    const directorio = await cargarDirectorio();

    expect(directorio).toEqual({
      comercios: [comercioViejo],
      rubros: [rubro],
      desdeGuardado: true,
      actualizadoEn: '2026-11-05T09:12:00.000Z',
    });
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('sin conexión y sin nada guardado (primera vez): deja pasar el error', async () => {
    mockPedir.mockRejectedValue(sinConexion());
    mockLeer.mockResolvedValue(null);

    await expect(cargarDirectorio()).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
  });

  it('sin conexión y con la base rota: también deja pasar el error de la API', async () => {
    mockPedir.mockRejectedValue(sinConexion());
    mockLeer.mockRejectedValue(new Error('la base no abre'));

    await expect(cargarDirectorio()).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
  });
});

describe('obtenerComercio', () => {
  it('con la API andando: devuelve el comercio de la API', async () => {
    mockPedir.mockResolvedValue({ datos: comercioNuevo as never, meta: null });
    expect(await obtenerComercio('com-1')).toEqual(comercioNuevo);
    expect(mockLeerComercio).not.toHaveBeenCalled();
  });

  it('sin conexión: usa la copia guardada', async () => {
    mockPedir.mockRejectedValue(sinConexion());
    mockLeerComercio.mockResolvedValue(comercioViejo);
    expect(await obtenerComercio('com-1')).toEqual(comercioViejo);
  });

  it('sin conexión y sin copia: deja pasar el error', async () => {
    mockPedir.mockRejectedValue(sinConexion());
    mockLeerComercio.mockResolvedValue(null);
    await expect(obtenerComercio('com-1')).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
  });

  it('un 404 NO usa la copia: el comercio ya no existe', async () => {
    mockPedir.mockRejectedValue(
      new ErrorApi({ codigo: 'COMERCIO_NO_ENCONTRADO', mensaje: 'No existe.' }),
    );
    mockLeerComercio.mockResolvedValue(comercioViejo);

    await expect(obtenerComercio('com-1')).rejects.toMatchObject({
      codigo: 'COMERCIO_NO_ENCONTRADO',
    });
    expect(mockLeerComercio).not.toHaveBeenCalled();
  });
});
