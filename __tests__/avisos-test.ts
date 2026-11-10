import type { Promocion } from '@/tipos';
import {
  ANTICIPACION_MS,
  esIdDeAviso,
  esIdDeAvisoNueva,
  idDeAviso,
  idDeAvisoNueva,
  idsDeTexto,
  planificarAvisos,
  podarAvisadas,
  podarVistas,
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

  it('conserva los avisos de "nueva" de las promos que siguen figurando', () => {
    const podadas = podarAvisadas(
      new Set(['nueva-pro-1', 'nueva-pro-9', 'vence-pro-1']),
      [promo('pro-1', 'com-1', 72)],
    );
    expect([...podadas].sort()).toEqual(['nueva-pro-1', 'vence-pro-1']);
  });
});

describe('podarVistas', () => {
  it('descarta las promos conocidas que ya no figuran', () => {
    const podadas = podarVistas(new Set(['pro-1', 'pro-9']), [promo('pro-1', 'com-1', 72)]);
    expect([...podadas]).toEqual(['pro-1']);
  });
});

// ---- Avisos de "promo nueva" (PRD: "aviso cuando aparece una promoción nueva de un favorito o de
// un rubro elegido") ----

// Una promo que ya empezó (hace 5 horas) y termina dentro de `horasRestantes`.
function promoVigente(id: string, comercioId: string, horasRestantes: number): Promocion {
  return { ...promo(id, comercioId, horasRestantes), desde: new Date(ahora.getTime() - 5 * HORA).toISOString() };
}

// Una promo que empieza en la fecha dada (hora local) y dura 3 días.
function promoQueEmpieza(id: string, comercioId: string, inicio: Date): Promocion {
  return {
    ...promo(id, comercioId, 0),
    desde: inicio.toISOString(),
    hasta: new Date(inicio.getTime() + 72 * HORA).toISOString(),
  };
}

describe('ids de aviso de "nueva"', () => {
  it('llevan su propio prefijo y se reconocen como avisos de promo', () => {
    expect(idDeAvisoNueva('pro-441')).toBe('nueva-pro-441');
    expect(esIdDeAviso('nueva-pro-441')).toBe(true);
    expect(esIdDeAvisoNueva('nueva-pro-441')).toBe(true);
    expect(esIdDeAvisoNueva('vence-pro-441')).toBe(false);
  });
});

describe('planificarAvisos: promo nueva', () => {
  it('una promo vigente de un favorito que la app no conocía se avisa enseguida', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: ['com-1'],
      vistas: new Set(),
    });

    const aviso = resultado.programar.find((a) => a.id === 'nueva-pro-1');
    expect(aviso).toBeDefined();
    expect(aviso?.fecha.getTime()).toBe(ahora.getTime() + 10_000);
    expect(aviso?.titulo).toBe('Nueva promo: Promo pro-1');
    expect(aviso?.cuerpo).toContain('Ferretería El Tornillo');
    expect(aviso?.promocionId).toBe('pro-1');
  });

  it('la primera vez de una cuenta no avisa de lo que ya existe (evita una avalancha al instalar)', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: ['com-1'],
      vistas: null,
    });
    // No hay aviso de "nueva": sólo queda el de "por vencer", que se programa para más adelante.
    expect(resultado.programar.map((a) => a.id)).toEqual(['vence-pro-1']);
  });

  it('sin indicar las vistas se toma como la primera vez', () => {
    const resultado = plan({ promociones: [promoVigente('pro-1', 'com-1', 200)], favoritos: ['com-1'] });
    expect(resultado.programar.some((a) => a.id.startsWith('nueva-'))).toBe(false);
  });

  it('una promo que la app ya conocía no es nueva', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: ['com-1'],
      vistas: new Set(['pro-1']),
    });
    expect(resultado.programar.some((a) => a.id.startsWith('nueva-'))).toBe(false);
  });

  it('una promo de un comercio que no interesa no avisa', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-2', 'com-2', 200)],
      favoritos: ['com-1'],
      vistas: new Set(),
    });
    expect(resultado.programar).toEqual([]);
  });

  it('una promo nueva de un rubro de interés avisa aunque el comercio no sea favorito', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-2', 'com-2', 200)],
      rubrosDeInteres: ['rub-gastronomia'],
      vistas: new Set(),
    });
    expect(resultado.programar.map((a) => a.id)).toContain('nueva-pro-2');
  });

  it('marcar un favorito nuevo no inunda de avisos: sus promos viejas ya eran conocidas', () => {
    // La app conoce TODAS las promos que vio (no sólo las de sus favoritos).
    const resultado = plan({
      promociones: [promoVigente('pro-2', 'com-2', 200)],
      favoritos: ['com-2'],
      vistas: new Set(['pro-2']),
    });
    expect(resultado.programar.some((a) => a.id.startsWith('nueva-'))).toBe(false);
  });

  it('el aviso de nueva no se repite si ya se avisó', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: ['com-1'],
      vistas: new Set(),
      yaAvisadas: new Set(['nueva-pro-1']),
    });
    expect(resultado.programar.some((a) => a.id === 'nueva-pro-1')).toBe(false);
  });

  it('una promo nueva con más de un día por delante programa los dos avisos: nueva ahora y por vencer después', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: ['com-1'],
      vistas: new Set(),
    });
    expect(resultado.programar.map((a) => a.id).sort()).toEqual(['nueva-pro-1', 'vence-pro-1']);
    expect(resultado.yaCubiertos).toEqual([]);
  });

  it('una promo nueva que además vence en menos de un día manda UN solo aviso', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 10)],
      favoritos: ['com-1'],
      vistas: new Set(),
    });
    expect(resultado.programar.map((a) => a.id)).toEqual(['nueva-pro-1']);
    expect(resultado.yaCubiertos).toEqual([{ id: 'vence-pro-1', de: 'nueva-pro-1' }]);
  });

  it('si se quita el favorito, el aviso de nueva programado se cancela', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: [],
      vistas: new Set(),
      yaAvisadas: new Set(['nueva-pro-1']),
      programadas: new Set(['nueva-pro-1']),
    });
    expect(resultado.cancelar).toEqual(['nueva-pro-1']);
  });

  it('el aviso de nueva programado de una promo que sigue interesando no se cancela', () => {
    const resultado = plan({
      promociones: [promoVigente('pro-1', 'com-1', 200)],
      favoritos: ['com-1'],
      vistas: new Set(['pro-1']),
      yaAvisadas: new Set(['nueva-pro-1', 'vence-pro-1']),
      programadas: new Set(['nueva-pro-1', 'vence-pro-1']),
    });
    expect(resultado.cancelar).toEqual([]);
  });
});

describe('planificarAvisos: promo que empieza más adelante', () => {
  it('se avisa el día que empieza, a la hora de inicio si ya es de día', () => {
    const inicio = new Date(2026, 10, 20, 18, 12); // 20/11, 18:12 (hora local)
    const resultado = plan({ promociones: [promoQueEmpieza('pro-1', 'com-1', inicio)], favoritos: ['com-1'] });

    const aviso = resultado.programar.find((a) => a.id === 'nueva-pro-1');
    expect(aviso?.fecha.getTime()).toBe(inicio.getTime());
    expect(aviso?.titulo).toBe('Empieza hoy: Promo pro-1');
  });

  it('si empieza de madrugada, el aviso sale a las 9 del mismo día (no a medianoche)', () => {
    const inicio = new Date(2026, 10, 20, 0, 0); // 20/11, 00:00 (hora local)
    const resultado = plan({ promociones: [promoQueEmpieza('pro-1', 'com-1', inicio)], favoritos: ['com-1'] });

    const fecha = resultado.programar.find((a) => a.id === 'nueva-pro-1')?.fecha;
    expect(fecha?.getFullYear()).toBe(2026);
    expect(fecha?.getMonth()).toBe(10);
    expect(fecha?.getDate()).toBe(20);
    expect(fecha?.getHours()).toBe(9);
    expect(fecha?.getMinutes()).toBe(0);
  });

  it('esto vale aunque sea la primera vez de la cuenta (no depende de las vistas)', () => {
    const inicio = new Date(2026, 10, 20, 18, 0);
    const resultado = plan({
      promociones: [promoQueEmpieza('pro-1', 'com-1', inicio)],
      favoritos: ['com-1'],
      vistas: null,
    });
    expect(resultado.programar.some((a) => a.id === 'nueva-pro-1')).toBe(true);
  });

  it('todavía no se programa el "por vencer": una promo que no empezó no puede vencer pronto', () => {
    const inicio = new Date(2026, 10, 20, 18, 0);
    const resultado = plan({ promociones: [promoQueEmpieza('pro-1', 'com-1', inicio)], favoritos: ['com-1'] });
    expect(resultado.programar.some((a) => a.id === 'vence-pro-1')).toBe(false);
  });

  it('el aviso de inicio ya programado no se repite ni se cancela', () => {
    const inicio = new Date(2026, 10, 20, 18, 0);
    const resultado = plan({
      promociones: [promoQueEmpieza('pro-1', 'com-1', inicio)],
      favoritos: ['com-1'],
      yaAvisadas: new Set(['nueva-pro-1']),
      programadas: new Set(['nueva-pro-1']),
    });
    expect(resultado.programar).toEqual([]);
    expect(resultado.cancelar).toEqual([]);
  });
});
