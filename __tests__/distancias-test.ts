import type { Comercio } from '@/tipos';
import {
  distanciaEnMetros,
  distanciasDesde,
  ordenarPorDistancia,
  textoDistancia,
} from '@/utilidades/distancias';

const centro = { latitud: -32.48, longitud: -58.23 };

describe('distanciaEnMetros', () => {
  it('un punto a sí mismo está a 0 m', () => {
    expect(distanciaEnMetros(centro, centro)).toBe(0);
  });

  it('0,01 grados de longitud a esta latitud son unos 938 m', () => {
    const otro = { latitud: -32.48, longitud: -58.22 };
    expect(Math.abs(distanciaEnMetros(centro, otro) - 938)).toBeLessThan(10);
  });

  it('1 grado de latitud son unos 111 km, y da lo mismo en el otro sentido', () => {
    const otro = { latitud: -33.48, longitud: -58.23 };
    expect(Math.abs(distanciaEnMetros(centro, otro) - 111_195)).toBeLessThan(200);
    expect(distanciaEnMetros(otro, centro)).toBeCloseTo(distanciaEnMetros(centro, otro), 6);
  });
});

describe('textoDistancia', () => {
  it('menos de un kilómetro va en metros, de a 10', () => {
    expect(textoDistancia(450)).toBe('a 450 m');
    expect(textoDistancia(453)).toBe('a 450 m');
    expect(textoDistancia(2)).toBe('a 10 m');
  });

  it('de 1 a 10 km lleva un decimal con coma', () => {
    expect(textoDistancia(1000)).toBe('a 1,0 km');
    expect(textoDistancia(1234)).toBe('a 1,2 km');
  });

  it('desde 10 km va redondeado', () => {
    expect(textoDistancia(15_400)).toBe('a 15 km');
  });

  it('999 m no termina escrito como "a 1000 m"', () => {
    expect(textoDistancia(999)).toBe('a 1,0 km');
  });
});

describe('ordenarPorDistancia', () => {
  function comercio(id: string, latitud: number, longitud: number): Comercio {
    return { id, coordenadas: { latitud, longitud } } as Comercio;
  }

  it('deja primero al más cercano y no modifica la lista original', () => {
    const lejos = comercio('lejos', -32.6, -58.23);
    const cerca = comercio('cerca', -32.481, -58.23);
    const medio = comercio('medio', -32.5, -58.23);
    const original = [lejos, cerca, medio];

    const distancias = distanciasDesde(centro, original);
    expect(ordenarPorDistancia(original, distancias).map((c) => c.id)).toEqual([
      'cerca',
      'medio',
      'lejos',
    ]);
    expect(original.map((c) => c.id)).toEqual(['lejos', 'cerca', 'medio']);
  });

  it('un comercio sin distancia va al final', () => {
    const a = comercio('a', -32.48, -58.23);
    const b = comercio('b', -32.7, -58.23);
    const distancias = new Map([['b', 100]]);
    expect(ordenarPorDistancia([a, b], distancias).map((c) => c.id)).toEqual(['b', 'a']);
  });
});
