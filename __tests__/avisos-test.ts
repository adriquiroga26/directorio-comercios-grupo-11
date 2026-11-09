import type { Promocion } from '@/tipos';
import {
  ANTICIPACION_MS,
  esIdDeAviso,
  idDeAviso,
  idsDeTexto,
  planificarAvisos,
  podarAvisadas,
} from '@/utilidades/avisos';

const ahora = new Date('2026-11-09T15:00:00-03:00');
const HORA = 60 * 60 * 1000;

function promo(id: string, comercioId: string, horasRestantes: number): Promocion {
  return {
    id,
    comercioId,
    titulo: `Promo ${id}`,
    hasta: new Date(ahora.getTime() + horasRestantes * HORA).toISOString(),
  } as Promocion;
}

const comercios = new Map([
  ['com-1', { nombre: 'Ferretería El Tornillo', rubroId: 'rub-ferreteria' }],
  ['com-2', { nombre: 'Panadería Santa Rita', rubroId: 'rub-gastronomia' }],
]);

function plan(parcial: Partial<Parameters<typeof planificarAvisos>[0]>) {
  return planificarAvisos({
    promociones: [],
    comercios,
    favoritos: [],
    rubrosDeInteres: [],
    ahora,
    yaAvisadas: new Set(),
    programadas: new Set(),
    ...parcial,
  });
}

describe('idDeAviso / esIdDeAviso', () => {
  it('lleva un prefijo propio y se reconoce', () => {
    expect(idDeAviso('pro-441')).toBe('vence-pro-441');
    expect(esIdDeAviso('vence-pro-441')).toBe(true);
    expect(esIdDeAviso('otra-cosa')).toBe(false);
  });
});

describe('planificarAvisos', () => {
  it('una promo de un favorito que vence en 3 días se programa un día antes del final', () => {
    const p = promo('pro-1', 'com-1', 72);
    const resultado = plan({ promociones: [p], favoritos: ['com-1'] });

    expect(resultado.programar).toHaveLength(1);
    const aviso = resultado.programar[0];
    expect(aviso.id).toBe('vence-pro-1');
    expect(aviso.promocionId).toBe('pro-1');
    expect(aviso.fecha.getTime()).toBe(Date.parse(p.hasta) - ANTICIPACION_MS);
    expect(aviso.titulo).toBe('Vence pronto: Promo pro-1');
    expect(aviso.cuerpo).toContain('Ferretería El Tornillo');
  });

  it('si ya falta menos de un día, se avisa enseguida (a los pocos segundos)', () => {
    const resultado = plan({ promociones: [promo('pro-1', 'com-1', 10)], favoritos: ['com-1'] });
    expect(resultado.programar[0].fecha.getTime()).toBe(ahora.getTime() + 10_000);
  });

  it('si faltan menos de 2 horas, ya no se avisa', () => {
    expect(plan({ promociones: [promo('pro-1', 'com-1', 1)], favoritos: ['com-1'] }).programar).toEqual([]);
  });

  it('una promo sin fecha válida se ignora', () => {
    const rota = { ...promo('pro-1', 'com-1', 72), hasta: 'no es una fecha' };
    expect(plan({ promociones: [rota], favoritos: ['com-1'] }).programar).toEqual([]);
  });

  it('un comercio que no es favorito ni de un rubro de interés no avisa', () => {
    expect(plan({ promociones: [promo('pro-2', 'com-2', 72)], favoritos: ['com-1'] }).programar).toEqual([]);
  });

  it('un comercio de un rubro de interés avisa aunque no sea favorito', () => {
    const resultado = plan({
      promociones: [promo('pro-2', 'com-2', 72)],
      rubrosDeInteres: ['rub-gastronomia'],
    });
    expect(resultado.programar.map((a) => a.id)).toEqual(['vence-pro-2']);
  });

  it('un comercio favorito Y de un rubro de interés avisa una sola vez', () => {
    const resultado = plan({
      promociones: [promo('pro-1', 'com-1', 72)],
      favoritos: ['com-1'],
      rubrosDeInteres: ['rub-ferreteria'],
    });
    expect(resultado.programar).toHaveLength(1);
  });

  it('un aviso que ya se programó antes no se programa de nuevo', () => {
    const resultado = plan({
      promociones: [promo('pro-1', 'com-1', 72)],
      favoritos: ['com-1'],
      yaAvisadas: new Set(['vence-pro-1']),
      programadas: new Set(['vence-pro-1']),
    });
    expect(resultado.programar).toEqual([]);
    expect(resultado.cancelar).toEqual([]); // sigue valiendo: no se toca
  });

  it('un aviso que ya salió (avisado pero ya no programado) tampoco vuelve a salir', () => {
    const resultado = plan({
      promociones: [promo('pro-1', 'com-1', 10)],
      favoritos: ['com-1'],
      yaAvisadas: new Set(['vence-pro-1']),
      programadas: new Set(),
    });
    expect(resultado.programar).toEqual([]);
  });

  it('si se quita el favorito, el aviso programado se cancela', () => {
    const resultado = plan({
      promociones: [promo('pro-1', 'com-1', 72)],
      favoritos: [],
      yaAvisadas: new Set(['vence-pro-1']),
      programadas: new Set(['vence-pro-1']),
    });
    expect(resultado.cancelar).toEqual(['vence-pro-1']);
  });

  it('un aviso programado de una promo que ya no existe se cancela', () => {
    const resultado = plan({ promociones: [], programadas: new Set(['vence-pro-9']) });
    expect(resultado.cancelar).toEqual(['vence-pro-9']);
  });

  it('no toca notificaciones que no son avisos de promo', () => {
    const resultado = plan({ promociones: [], programadas: new Set(['otra-notificacion']) });
    expect(resultado.cancelar).toEqual([]);
  });
});

describe('idsDeTexto', () => {
  it('lee una lista JSON de ids', () => {
    expect([...idsDeTexto('["vence-pro-1","vence-pro-2"]')]).toEqual(['vence-pro-1', 'vence-pro-2']);
  });

  it('sin nada guardado, con texto roto o con otra cosa, da una lista vacía', () => {
    expect(idsDeTexto(null).size).toBe(0);
    expect(idsDeTexto('{esto no es json').size).toBe(0);
    expect(idsDeTexto('{"a":1}').size).toBe(0);
  });

  it('descarta lo que no es texto', () => {
    expect([...idsDeTexto('["vence-pro-1", 5, null]')]).toEqual(['vence-pro-1']);
  });
});

describe('podarAvisadas', () => {
  it('descarta los ids de promos que ya no figuran', () => {
    const podadas = podarAvisadas(
      new Set(['vence-pro-1', 'vence-pro-9']),
      [promo('pro-1', 'com-1', 72)],
    );
    expect([...podadas]).toEqual(['vence-pro-1']);
  });
});
