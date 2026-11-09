import { validarResena } from '@/utilidades/resenas';

describe('validarResena', () => {
  it('acepta una reseña con estrellas y comentario', () => {
    expect(validarResena({ estrellas: 5, comentario: 'Muy buena atención.' })).toBeNull();
    expect(validarResena({ estrellas: 1, comentario: 'x' })).toBeNull();
  });

  it('exige elegir las estrellas (0 es "todavía no eligió")', () => {
    expect(validarResena({ estrellas: 0, comentario: 'Hola' })).toBe('Elegí de 1 a 5 estrellas.');
  });

  it('rechaza estrellas fuera de rango o con decimales', () => {
    expect(validarResena({ estrellas: 6, comentario: 'Hola' })).toBe('Elegí de 1 a 5 estrellas.');
    expect(validarResena({ estrellas: 2.5, comentario: 'Hola' })).toBe('Elegí de 1 a 5 estrellas.');
  });

  it('exige un comentario y no cuenta los espacios', () => {
    expect(validarResena({ estrellas: 4, comentario: '' })).toBe('Escribí un comentario.');
    expect(validarResena({ estrellas: 4, comentario: '    ' })).toBe('Escribí un comentario.');
  });

  it('acepta 1000 caracteres y rechaza 1001', () => {
    expect(validarResena({ estrellas: 4, comentario: 'a'.repeat(1000) })).toBeNull();
    expect(validarResena({ estrellas: 4, comentario: 'a'.repeat(1001) })).toBe(
      'El comentario puede tener hasta 1000 caracteres.',
    );
  });
});
