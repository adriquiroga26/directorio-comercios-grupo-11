import type { Promocion } from '@/tipos';
import { claveDelDia, diaDeFecha, fechaDeIso } from '@/utilidades/fechas';
import {
  estadoMiPromocion,
  finDelDiaIso,
  inicioDelDiaIso,
  validarPromocion,
} from '@/utilidades/promociones';

const AHORA = new Date('2026-11-08T12:00:00-03:00');

const promo: Promocion = {
  id: 'pro-1',
  comercioId: 'com-118',
  titulo: 'Promo',
  detalle: 'Detalle',
  descuento: 15,
  desde: '2026-11-01T00:00:00-03:00',
  hasta: '2026-11-30T23:59:00-03:00',
  imagenUrl: null,
  soloApp: false,
  usos: 3,
  activa: true,
};

const valida = {
  titulo: '15% en pinturas',
  detalle: 'No acumulable.',
  descuento: '15',
  desde: new Date(2026, 10, 8), // 8/11/2026 (los meses van de 0 a 11)
  hasta: new Date(2026, 10, 15),
};

describe('fechas del selector', () => {
  it('arma el inicio y el fin del día en hora de Argentina', () => {
    const dia = new Date(2026, 9, 1);
    expect(inicioDelDiaIso(dia)).toBe('2026-10-01T00:00:00-03:00');
    expect(finDelDiaIso(dia)).toBe('2026-10-01T23:59:00-03:00');
  });

  it('muestra el día como dd/mm/aaaa y lo vuelve a leer desde el texto ISO', () => {
    expect(diaDeFecha(new Date(2026, 8, 5))).toBe('05/09/2026');
    expect(claveDelDia(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(diaDeFecha(fechaDeIso('2026-09-30T23:59:00-03:00'))).toBe('30/09/2026');
  });
});

describe('estadoMiPromocion', () => {
  it('una promo dada de baja figura como baja aunque esté en fecha', () => {
    expect(estadoMiPromocion({ ...promo, activa: false }, AHORA)).toBe('baja');
  });

  it('una promo activa sigue los estados por fechas', () => {
    expect(estadoMiPromocion(promo, AHORA)).toBe('vigente');
    expect(estadoMiPromocion({ ...promo, desde: '2026-12-01T00:00:00-03:00' }, AHORA)).toBe('proxima');
    expect(estadoMiPromocion({ ...promo, hasta: '2026-11-02T23:59:00-03:00' }, AHORA)).toBe('vencida');
  });
});

describe('validarPromocion', () => {
  it('acepta una promo correcta, con o sin descuento', () => {
    expect(validarPromocion(valida, AHORA)).toBeNull();
    expect(validarPromocion({ ...valida, descuento: '' }, AHORA)).toBeNull();
  });

  it('exige título y detalle', () => {
    expect(validarPromocion({ ...valida, titulo: '  ' }, AHORA)).toBe(
      'El título tiene que tener entre 1 y 120 letras.',
    );
    expect(validarPromocion({ ...valida, titulo: 'a'.repeat(121) }, AHORA)).toBe(
      'El título tiene que tener entre 1 y 120 letras.',
    );
    expect(validarPromocion({ ...valida, detalle: '' }, AHORA)).toBe(
      'El detalle tiene que tener entre 1 y 2000 letras.',
    );
  });

  it('el descuento tiene que ser un entero de 1 a 100', () => {
    const mensaje = 'El descuento tiene que ser un número entero de 1 a 100.';
    expect(validarPromocion({ ...valida, descuento: '0' }, AHORA)).toBe(mensaje);
    expect(validarPromocion({ ...valida, descuento: '101' }, AHORA)).toBe(mensaje);
    expect(validarPromocion({ ...valida, descuento: '12.5' }, AHORA)).toBe(mensaje);
    expect(validarPromocion({ ...valida, descuento: 'diez' }, AHORA)).toBe(mensaje);
    expect(validarPromocion({ ...valida, descuento: '100' }, AHORA)).toBeNull();
  });

  it('no puede terminar antes de empezar ni estar ya vencida', () => {
    expect(
      validarPromocion({ ...valida, desde: new Date(2026, 10, 20), hasta: new Date(2026, 10, 15) }, AHORA),
    ).toBe('La promoción no puede terminar antes de empezar.');
    expect(
      validarPromocion({ ...valida, desde: new Date(2026, 10, 1), hasta: new Date(2026, 10, 7) }, AHORA),
    ).toBe('La promoción tiene que terminar hoy o más adelante.');
  });

  it('puede empezar y terminar el mismo día, y terminar hoy', () => {
    const hoy = new Date(2026, 10, 8);
    expect(validarPromocion({ ...valida, desde: hoy, hasta: hoy }, AHORA)).toBeNull();
  });
});
