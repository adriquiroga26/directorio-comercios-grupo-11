import { guardarYaAvisadas, leerYaAvisadas } from '@/almacen/avisos';
import { cancelarAvisos, idsProgramados, programarAviso } from '@/avisos/notificaciones';
import { quitarAvisosProgramados, sincronizarAvisos } from '@/avisos/sincronizar';
import { listarPromociones } from '@/servicios';
import type { Comercio, Promocion, Usuario } from '@/tipos';

// Las notificaciones y el kv-store son nativos y no corren en Jest: se reemplazan por una "agenda"
// de mentira (un Set de ids programados y otro de ya avisadas) para probar la POLÍTICA de
// sincronizar: qué se programa, qué se cancela y qué se recuerda.
jest.mock('@/almacen/avisos', () => ({
  leerYaAvisadas: jest.fn(),
  guardarYaAvisadas: jest.fn(),
}));
jest.mock('@/avisos/notificaciones', () => ({
  cancelarAvisos: jest.fn(),
  idsProgramados: jest.fn(),
  programarAviso: jest.fn(),
}));
jest.mock('@/servicios', () => ({ listarPromociones: jest.fn() }));

const mockLeerAvisadas = jest.mocked(leerYaAvisadas);
const mockGuardarAvisadas = jest.mocked(guardarYaAvisadas);
const mockCancelar = jest.mocked(cancelarAvisos);
const mockProgramadas = jest.mocked(idsProgramados);
const mockProgramar = jest.mocked(programarAviso);
const mockPromociones = jest.mocked(listarPromociones);

const DIA = 24 * 60 * 60 * 1000;

// Vence en 3 días: el aviso se programa para dentro de 2 días (un día antes del final).
const promociones = [
  {
    id: 'pro-1',
    comercioId: 'com-1',
    titulo: 'Promo 1',
    hasta: new Date(Date.now() + 3 * DIA).toISOString(),
  } as Promocion,
];
const comercios = [{ id: 'com-1', nombre: 'El Tornillo', rubroId: 'rub-1' } as Comercio];

function vecino(favoritos: string[]): Usuario {
  return { id: 'usr-1', rol: 'vecino', favoritos, rubrosDeInteres: [] } as unknown as Usuario;
}

let programadas: Set<string>;
let avisadas: Set<string>;

beforeEach(() => {
  programadas = new Set();
  avisadas = new Set();
  jest.clearAllMocks();
  mockPromociones.mockResolvedValue(promociones);
  mockProgramadas.mockImplementation(async () => new Set(programadas));
  mockProgramar.mockImplementation(async (aviso) => {
    programadas.add(aviso.id);
  });
  mockCancelar.mockImplementation(async (ids) => {
    ids.forEach((id) => programadas.delete(id));
  });
  mockLeerAvisadas.mockImplementation(() => new Set(avisadas));
  mockGuardarAvisadas.mockImplementation((_usuarioId, ids) => {
    avisadas = new Set(ids);
  });
});

describe('sincronizarAvisos', () => {
  it('programa el aviso de la promo de un favorito y lo anota como avisado', async () => {
    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(programadas).toEqual(new Set(['vence-pro-1']));
    expect(avisadas).toEqual(new Set(['vence-pro-1']));
  });

  it('no repite un aviso que ya está programado', async () => {
    await sincronizarAvisos(vecino(['com-1']), comercios);
    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(mockProgramar).toHaveBeenCalledTimes(1);
  });

  it('si se quita el favorito y se vuelve a poner, el aviso se programa de nuevo', async () => {
    await sincronizarAvisos(vecino(['com-1']), comercios);
    await sincronizarAvisos(vecino([]), comercios); // se cancela antes de salir
    expect(programadas.size).toBe(0);

    await sincronizarAvisos(vecino(['com-1']), comercios);
    expect(programadas).toEqual(new Set(['vence-pro-1']));
  });

  it('un aviso que ya salió (anotado pero ya no programado) no vuelve a programarse', async () => {
    avisadas = new Set(['vence-pro-1']); // salió: está anotado y ya no figura programado

    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(mockProgramar).not.toHaveBeenCalled();
  });
});

describe('quitarAvisosProgramados', () => {
  it('cancela lo programado y lo borra de las ya avisadas, pero no lo que ya salió', async () => {
    programadas = new Set(['vence-pro-1']);
    avisadas = new Set(['vence-pro-1', 'vence-pro-2']); // pro-2 ya salió

    await quitarAvisosProgramados('usr-1');

    expect(programadas.size).toBe(0);
    expect(avisadas).toEqual(new Set(['vence-pro-2']));
  });

  it('sin cuenta conocida cancela igual, y no toca la lista de ya avisadas', async () => {
    programadas = new Set(['vence-pro-1']);
    avisadas = new Set(['vence-pro-1']);

    await quitarAvisosProgramados(null);

    expect(programadas.size).toBe(0);
    expect(mockGuardarAvisadas).not.toHaveBeenCalled();
  });

  it('al apagar los avisos y prenderlos de nuevo, se vuelven a programar', async () => {
    await sincronizarAvisos(vecino(['com-1']), comercios);
    await quitarAvisosProgramados('usr-1'); // avisos apagados
    expect(programadas.size).toBe(0);

    await sincronizarAvisos(vecino(['com-1']), comercios); // avisos prendidos
    expect(programadas).toEqual(new Set(['vence-pro-1']));
  });
});
