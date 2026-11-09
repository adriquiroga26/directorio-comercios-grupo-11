import { leerPreferenciasDeTexto, normalizarPreferencias, PREFERENCIAS_POR_DEFECTO } from '@/utilidades/preferencias';
import { FORMATO_ID_RESENA, nuevoIdDeResena } from '@/utilidades/resenasPendientes';

describe('nuevoIdDeResena', () => {
  it('cumple el formato que pide la API', () => {
    for (let i = 0; i < 50; i++) {
      expect(nuevoIdDeResena()).toMatch(FORMATO_ID_RESENA);
    }
  });

  it('dos ids de momentos distintos son distintos', () => {
    expect(nuevoIdDeResena(1_000_000)).not.toBe(nuevoIdDeResena(1_000_001));
  });

  it('dos ids del mismo milisegundo se separan con letras al azar', () => {
    expect(nuevoIdDeResena(5_000, () => 0.1)).not.toBe(nuevoIdDeResena(5_000, () => 0.9));
  });

  it('es determinista cuando se le da la hora y el azar', () => {
    expect(nuevoIdDeResena(36, () => 0)).toBe('res-100000000000');
  });
});

describe('normalizarPreferencias', () => {
  it('conserva preferencias válidas', () => {
    const valor = { rubroId: 'rub-hogar', soloAbiertos: true, masCercaPrimero: true };
    expect(normalizarPreferencias(valor)).toEqual(valor);
  });

  it('completa lo que falta y descarta lo que no sirve', () => {
    expect(normalizarPreferencias({})).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(
      normalizarPreferencias({ rubroId: 42, soloAbiertos: 'si', masCercaPrimero: 1 }),
    ).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it('algo que no es un objeto da los valores por defecto', () => {
    expect(normalizarPreferencias(null)).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(normalizarPreferencias('hola')).toEqual(PREFERENCIAS_POR_DEFECTO);
  });
});

describe('leerPreferenciasDeTexto', () => {
  it('lee un JSON guardado', () => {
    expect(
      leerPreferenciasDeTexto('{"rubroId":"rub-salud","soloAbiertos":true,"masCercaPrimero":false}'),
    ).toEqual({ rubroId: 'rub-salud', soloAbiertos: true, masCercaPrimero: false });
  });

  it('sin nada guardado o con texto roto, da los valores por defecto', () => {
    expect(leerPreferenciasDeTexto(null)).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(leerPreferenciasDeTexto('{esto no es json')).toEqual(PREFERENCIAS_POR_DEFECTO);
  });
});
