import { guardarVistas, guardarYaAvisadas, leerVistas, leerYaAvisadas } from '@/almacen/avisos';
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
  leerVistas: jest.fn(),
  guardarVistas: jest.fn(),
}));
jest.mock('@/avisos/notificaciones', () => ({
  cancelarAvisos: jest.fn(),
  idsProgramados: jest.fn(),
  programarAviso: jest.fn(),
}));
jest.mock('@/servicios', () => ({ listarPromociones: jest.fn() }));

const mockLeerAvisadas = jest.mocked(leerYaAvisadas);
const mockGuardarAvisadas = jest.mocked(guardarYaAvisadas);
const mockLeerVistas = jest.mocked(leerVistas);
const mockGuardarVistas = jest.mocked(guardarVistas);
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
// null = la primera vez de la cuenta (todavía no se guardó nada).
let vistas: Set<string> | null;

beforeEach(() => {
  programadas = new Set();
  avisadas = new Set();
  vistas = null;
  jest.clearAllMocks();
  mockLeerVistas.mockImplementation(() => (vistas === null ? null : new Set(vistas)));
  mockGuardarVistas.mockImplementation((_usuarioId, ids) => {
    vistas = new Set(ids);
  });
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

// ---- Avisos de "promo nueva" ----

// Una promo ya vigente (empezó hace 5 horas) que termina dentro de `horas`.
function promoYaVigente(id: string, comercioId: string, horas: number): Promocion {
  return {
    id,
    comercioId,
    titulo: `Promo ${id}`,
    desde: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    hasta: new Date(Date.now() + horas * 60 * 60 * 1000).toISOString(),
  } as Promocion;
}

describe('sincronizarAvisos: promo nueva', () => {
  it('la primera vez no avisa de lo que ya existe, pero lo anota como conocido', async () => {
    mockPromociones.mockResolvedValue([promoYaVigente('pro-1', 'com-1', 200)]);

    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect([...programadas].some((id) => id.startsWith('nueva-'))).toBe(false);
    expect(vistas).toEqual(new Set(['pro-1']));
  });

  it('una promo que aparece después de la primera vez se avisa como nueva', async () => {
    mockPromociones.mockResolvedValue([promoYaVigente('pro-1', 'com-1', 200)]);
    await sincronizarAvisos(vecino(['com-1']), comercios); // primera vez

    mockPromociones.mockResolvedValue([
      promoYaVigente('pro-1', 'com-1', 200),
      promoYaVigente('pro-2', 'com-1', 200), // la acaba de cargar el comercio
    ]);
    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(programadas.has('nueva-pro-2')).toBe(true);
    expect(programadas.has('nueva-pro-1')).toBe(false);
    expect(vistas).toEqual(new Set(['pro-1', 'pro-2']));
  });

  it('no repite el aviso de nueva en las sincronizaciones siguientes', async () => {
    mockPromociones.mockResolvedValue([promoYaVigente('pro-1', 'com-1', 200)]);
    await sincronizarAvisos(vecino(['com-1']), comercios);
    mockPromociones.mockResolvedValue([
      promoYaVigente('pro-1', 'com-1', 200),
      promoYaVigente('pro-2', 'com-1', 200),
    ]);
    await sincronizarAvisos(vecino(['com-1']), comercios);
    mockProgramar.mockClear();

    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(mockProgramar).not.toHaveBeenCalled();
  });

  it('una promo de un comercio que no interesa no avisa, pero se la da por conocida', async () => {
    mockPromociones.mockResolvedValue([promoYaVigente('pro-1', 'com-1', 200)]);
    await sincronizarAvisos(vecino(['com-1']), comercios); // primera vez

    mockPromociones.mockResolvedValue([
      promoYaVigente('pro-1', 'com-1', 200),
      promoYaVigente('pro-2', 'com-2', 200), // de otro comercio, que no es favorito
    ]);
    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(programadas.has('nueva-pro-2')).toBe(false);
    expect(vistas?.has('pro-2')).toBe(true);

    // Si después la persona marca ese comercio como favorito, no le llegan avisos de promos viejas.
    mockProgramar.mockClear();
    await sincronizarAvisos(vecino(['com-1', 'com-2']), [
      ...comercios,
      { id: 'com-2', nombre: 'Panadería', rubroId: 'rub-2' } as Comercio,
    ]);
    expect(programadas.has('nueva-pro-2')).toBe(false);
  });

  it('una promo nueva que vence en menos de un día manda un solo aviso y deja anotados los dos', async () => {
    mockPromociones.mockResolvedValue([promoYaVigente('pro-1', 'com-1', 200)]);
    await sincronizarAvisos(vecino(['com-1']), comercios); // primera vez

    mockPromociones.mockResolvedValue([
      promoYaVigente('pro-1', 'com-1', 200),
      promoYaVigente('pro-3', 'com-1', 10), // vence hoy
    ]);
    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(programadas.has('nueva-pro-3')).toBe(true);
    expect(programadas.has('vence-pro-3')).toBe(false);
    expect(avisadas.has('nueva-pro-3')).toBe(true);
    expect(avisadas.has('vence-pro-3')).toBe(true); // cubierto: no se vuelve a avisar después
  });

  it('si no se pudo programar el aviso de una promo nueva, no se la da por conocida (se reintenta)', async () => {
    mockPromociones.mockResolvedValue([promoYaVigente('pro-1', 'com-1', 200)]);
    await sincronizarAvisos(vecino(['com-1']), comercios); // primera vez

    mockPromociones.mockResolvedValue([
      promoYaVigente('pro-1', 'com-1', 200),
      promoYaVigente('pro-2', 'com-1', 200),
    ]);
    mockProgramar.mockRejectedValueOnce(new Error('falló el sistema'));
    await sincronizarAvisos(vecino(['com-1']), comercios);

    expect(vistas?.has('pro-2')).toBe(false);

    // Al reintentar, ahora sí sale.
    await sincronizarAvisos(vecino(['com-1']), comercios);
    expect(programadas.has('nueva-pro-2')).toBe(true);
  });

  it('al apagar y volver a prender los avisos, un aviso de inicio programado se reprograma', async () => {
    const inicio = new Date(Date.now() + 3 * DIA);
    mockPromociones.mockResolvedValue([
      {
        id: 'pro-5',
        comercioId: 'com-1',
        titulo: 'Promo 5',
        desde: inicio.toISOString(),
        hasta: new Date(inicio.getTime() + 3 * DIA).toISOString(),
      } as Promocion,
    ]);

    await sincronizarAvisos(vecino(['com-1']), comercios);
    expect(programadas.has('nueva-pro-5')).toBe(true);

    await quitarAvisosProgramados('usr-1'); // avisos apagados
    expect(programadas.size).toBe(0);

    await sincronizarAvisos(vecino(['com-1']), comercios); // avisos prendidos
    expect(programadas.has('nueva-pro-5')).toBe(true);
  });
});
