import {
  agregarFoto,
  enMegas,
  MAX_BYTES_FOTO,
  MAX_BYTES_VIDEO,
  quitarFoto,
  validarTamano,
} from '@/utilidades/multimedia';

describe('enMegas', () => {
  it('escribe los megas con coma decimal', () => {
    expect(enMegas(5 * 1024 * 1024)).toBe('5,0 MB');
    expect(enMegas(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });
});

describe('validarTamano', () => {
  it('una foto de hasta 5 MB entra y una más pesada no', () => {
    expect(validarTamano('imagen', MAX_BYTES_FOTO)).toBeNull();
    expect(validarTamano('imagen', MAX_BYTES_FOTO + 1)).toBe(
      'La foto pesa 5,0 MB y el máximo es 5,0 MB.',
    );
  });

  it('un video de hasta 30 MB entra y uno más pesado no', () => {
    expect(validarTamano('video', MAX_BYTES_VIDEO)).toBeNull();
    expect(validarTamano('video', 40 * 1024 * 1024)).toBe(
      'El video pesa 40,0 MB y el máximo es 30,0 MB.',
    );
  });

  it('si no se sabe cuánto pesa, lo decide la API', () => {
    expect(validarTamano('imagen', null)).toBeNull();
    expect(validarTamano('video', null)).toBeNull();
  });
});

describe('agregarFoto / quitarFoto', () => {
  it('agrega al final y no repite', () => {
    expect(agregarFoto(['a'], 'b')).toEqual(['a', 'b']);
    expect(agregarFoto(['a', 'b'], 'b')).toEqual(['a', 'b']);
  });

  it('quita sólo la foto indicada', () => {
    expect(quitarFoto(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(quitarFoto(['a'], 'z')).toEqual(['a']);
  });

  it('no modifica la lista original', () => {
    const original = ['a', 'b'];
    agregarFoto(original, 'c');
    quitarFoto(original, 'a');
    expect(original).toEqual(['a', 'b']);
  });
});
