import { promocionesMock } from '@/mocks';
import type { Promocion } from '@/tipos';
import { estadoPromocion, estaPorVencer } from '@/utilidades/promociones';

function promo(id: string): Promocion {
  const encontrada = promocionesMock.find((p) => p.id === id);
  if (!encontrada) throw new Error(`No existe el mock "${id}"`);
  return encontrada;
}

describe('estadoPromocion', () => {
  // pro-441: vigente del 01/09 al 30/09/2026.
  it('es vigente dentro del rango desde/hasta', () => {
    expect(estadoPromocion(promo('pro-441'), new Date('2026-09-15T12:00:00-03:00'))).toBe('vigente');
  });

  it('es vigente justo en el instante de inicio', () => {
    expect(estadoPromocion(promo('pro-441'), new Date('2026-09-01T00:00:00-03:00'))).toBe('vigente');
  });

  it('es vigente justo en el instante de fin', () => {
    expect(estadoPromocion(promo('pro-441'), new Date('2026-09-30T23:59:00-03:00'))).toBe('vigente');
  });

  it('es vencida un minuto después del fin', () => {
    expect(estadoPromocion(promo('pro-441'), new Date('2026-10-01T00:00:00-03:00'))).toBe('vencida');
  });

  // pro-442: arranca el 01/10/2026, todavía no empezó si la miramos en septiembre.
  it('es próxima antes de la fecha de inicio', () => {
    expect(estadoPromocion(promo('pro-442'), new Date('2026-09-15T12:00:00-03:00'))).toBe('proxima');
  });

  // pro-380: vencida en agosto, aunque su campo "activa" siga en true.
  it('es vencida aunque el campo activa sea true', () => {
    const vencida = promo('pro-380');
    expect(vencida.activa).toBe(true);
    expect(estadoPromocion(vencida, new Date('2026-09-15T12:00:00-03:00'))).toBe('vencida');
  });
});

describe('estaPorVencer', () => {
  it('no avisa si falta más de 3 días', () => {
    // pro-441 vence el 30/09; el 20/09 faltan 10 días.
    expect(estaPorVencer(promo('pro-441'), new Date('2026-09-20T12:00:00-03:00'))).toBe(false);
  });

  it('avisa si faltan 3 días o menos', () => {
    expect(estaPorVencer(promo('pro-441'), new Date('2026-09-28T12:00:00-03:00'))).toBe(true);
  });

  it('no avisa sobre una promo que todavía no empezó', () => {
    expect(estaPorVencer(promo('pro-442'), new Date('2026-09-15T12:00:00-03:00'))).toBe(false);
  });

  it('no avisa sobre una promo ya vencida', () => {
    expect(estaPorVencer(promo('pro-380'), new Date('2026-09-15T12:00:00-03:00'))).toBe(false);
  });
});
