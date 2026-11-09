import type { Comercio } from '@/tipos';
import { cambiosDeFicha, camposDeComercio, validarFicha } from '@/utilidades/ficha';

const comercio: Comercio = {
  id: 'com-118',
  nombre: 'Ferretería El Tornillo',
  rubroId: 'rub-ferreteria',
  descripcion: 'Todo para el hogar y la obra.',
  direccion: '9 de Julio 500',
  coordenadas: { latitud: -32.48, longitud: -58.23 },
  telefono: '3442 421000',
  whatsapp: null,
  instagram: '@eltornillo',
  imagenes: [],
  videoUrl: null,
  horarios: [{ dia: 1, abre: '08:00', cierra: '12:00' }],
  mediosDePago: ['efectivo', 'debito'],
  puntaje: 4.5,
  cantidadResenas: 12,
  codigoQr: null,
  activo: true,
};

describe('validarFicha', () => {
  const buena = camposDeComercio(comercio);

  it('acepta los datos guardados tal cual', () => {
    expect(validarFicha(buena)).toBeNull();
  });

  it('exige nombre, descripción y dirección (sin contar espacios)', () => {
    expect(validarFicha({ ...buena, nombre: '   ' })).toContain('nombre');
    expect(validarFicha({ ...buena, descripcion: '' })).toContain('descripción');
    expect(validarFicha({ ...buena, direccion: '' })).toContain('dirección');
  });

  it('acepta los contactos vacíos (son opcionales)', () => {
    expect(validarFicha({ ...buena, telefono: '', whatsapp: '', instagram: '' })).toBeNull();
  });

  it('el WhatsApp son 10 a 15 números', () => {
    expect(validarFicha({ ...buena, whatsapp: '5493442421000' })).toBeNull();
    expect(validarFicha({ ...buena, whatsapp: '123456789' })).toContain('WhatsApp');
    expect(validarFicha({ ...buena, whatsapp: '+54 9 3442 421000' })).toContain('WhatsApp');
  });

  it('el Instagram empieza con @ y usa letras, números, punto o guion bajo', () => {
    expect(validarFicha({ ...buena, instagram: '@el_tornillo.ok' })).toBeNull();
    expect(validarFicha({ ...buena, instagram: 'eltornillo' })).toContain('Instagram');
    expect(validarFicha({ ...buena, instagram: '@el tornillo' })).toContain('Instagram');
  });
});

describe('cambiosDeFicha', () => {
  const igual = camposDeComercio(comercio);

  it('si no se tocó nada, no hay cambios', () => {
    expect(cambiosDeFicha(comercio, igual)).toEqual({});
  });

  it('manda sólo los campos que cambiaron', () => {
    expect(cambiosDeFicha(comercio, { ...igual, nombre: '  Tornillo SA ' })).toEqual({
      nombre: 'Tornillo SA',
    });
  });

  it('un contacto que se vacía se manda como null y uno nuevo como texto', () => {
    const cambios = cambiosDeFicha(comercio, { ...igual, telefono: '', whatsapp: '5493442421000' });
    expect(cambios).toEqual({ telefono: null, whatsapp: '5493442421000' });
  });

  it('un contacto que estaba vacío y sigue vacío no cuenta como cambio', () => {
    expect(cambiosDeFicha(comercio, { ...igual, whatsapp: '  ' })).toEqual({});
  });

  it('los medios de pago cambian sin importar el orden', () => {
    expect(cambiosDeFicha(comercio, { ...igual, mediosDePago: ['debito', 'efectivo'] })).toEqual({});
    expect(cambiosDeFicha(comercio, { ...igual, mediosDePago: ['efectivo'] })).toEqual({
      mediosDePago: ['efectivo'],
    });
  });

  it('nunca manda los horarios', () => {
    expect('horarios' in cambiosDeFicha(comercio, { ...igual, nombre: 'Otro' })).toBe(false);
  });
});
