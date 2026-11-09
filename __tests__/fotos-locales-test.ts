import {
  nombreDeArchivoLocal,
  planificarFotos,
  textoTamano,
  urlsDeFotos,
} from '@/utilidades/fotosLocales';

describe('nombreDeArchivoLocal', () => {
  it('usa lo que sigue a /archivos/, con guiones bajos en vez de barras', () => {
    expect(
      nombreDeArchivoLocal('http://192.168.1.7:3000/archivos/imagenes/2026/11/ab12.png'),
    ).toBe('imagenes_2026_11_ab12.png');
  });

  it('no depende del servidor: la misma foto con otra IP tiene el mismo nombre', () => {
    const conIp = nombreDeArchivoLocal('http://192.168.1.7:3000/archivos/imagenes/2026/11/ab12.png');
    const conLocalhost = nombreDeArchivoLocal('http://localhost:3000/archivos/imagenes/2026/11/ab12.png');
    expect(conIp).toBe(conLocalhost);
  });

  it('ignora parámetros de la dirección y deja sólo caracteres seguros', () => {
    expect(nombreDeArchivoLocal('http://x/archivos/imagenes/a b.png?token=1')).toBe('imagenes_a_b.png');
  });

  it('una dirección que no es de /archivos/ también da un nombre válido', () => {
    expect(nombreDeArchivoLocal('https://ejemplo.com/foto.jpg')).toBe('https___ejemplo.com_foto.jpg');
  });
});

describe('urlsDeFotos', () => {
  it('junta las fotos de todos los comercios sin repetir', () => {
    expect(
      urlsDeFotos([{ imagenes: ['a', 'b'] }, { imagenes: [] }, { imagenes: ['b', 'c'] }]),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('planificarFotos', () => {
  const u1 = 'http://h/archivos/imagenes/1.png';
  const u2 = 'http://h/archivos/imagenes/2.png';

  it('con nada guardado, hay que descargar todas', () => {
    expect(planificarFotos([u1, u2], [])).toEqual({
      descargar: [
        { url: u1, nombre: 'imagenes_1.png' },
        { url: u2, nombre: 'imagenes_2.png' },
      ],
      borrar: [],
    });
  });

  it('las que ya están guardadas no se vuelven a bajar', () => {
    expect(planificarFotos([u1, u2], ['imagenes_1.png']).descargar).toEqual([
      { url: u2, nombre: 'imagenes_2.png' },
    ]);
  });

  it('las guardadas que ningún comercio usa más se borran', () => {
    const plan = planificarFotos([u1], ['imagenes_1.png', 'imagenes_vieja.png']);
    expect(plan.descargar).toEqual([]);
    expect(plan.borrar).toEqual(['imagenes_vieja.png']);
  });

  it('todo al día: no hay nada que hacer', () => {
    expect(planificarFotos([u1], ['imagenes_1.png'])).toEqual({ descargar: [], borrar: [] });
  });
});

describe('textoTamano', () => {
  it('elige la unidad que corresponde', () => {
    expect(textoTamano(512)).toBe('512 B');
    expect(textoTamano(2048)).toBe('2 KB');
    expect(textoTamano(3.4 * 1024 * 1024)).toBe('3,4 MB');
    expect(textoTamano(12.8 * 1024 * 1024 * 1024)).toBe('12,8 GB');
  });

  it('cero bytes', () => {
    expect(textoTamano(0)).toBe('0 B');
  });
});
