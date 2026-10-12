import { fechaConAnio, fechaCorta } from '@/utilidades/fechas';

describe('fechaCorta', () => {
  it('recorta el ISO a día/mes', () => {
    expect(fechaCorta('2026-09-30T23:59:00-03:00')).toBe('30/09');
  });

  it('no se ve afectada por el sufijo de huso horario', () => {
    expect(fechaCorta('2026-01-05T00:00:00Z')).toBe('05/01');
  });
});

describe('fechaConAnio', () => {
  it('recorta el ISO a día/mes/año', () => {
    expect(fechaConAnio('2026-09-10T17:05:00-03:00')).toBe('10/09/2026');
  });
});
