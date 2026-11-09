import { textoGuardadoEl } from '@/utilidades/guardado';

// Fechas armadas con la hora local (igual que la función): el resultado no depende del huso.
const ahora = new Date(2026, 10, 9, 15, 0);

describe('textoGuardadoEl', () => {
  it('del mismo día: "hoy a las HH:MM"', () => {
    expect(textoGuardadoEl(new Date(2026, 10, 9, 8, 5).toISOString(), ahora)).toBe('hoy a las 08:05');
  });

  it('del día anterior: "ayer a las HH:MM", aunque hayan pasado menos de 24 horas', () => {
    const casiMedianoche = new Date(2026, 10, 8, 23, 50).toISOString();
    expect(textoGuardadoEl(casiMedianoche, new Date(2026, 10, 9, 0, 10))).toBe('ayer a las 23:50');
  });

  it('de antes: "el DD/MM a las HH:MM"', () => {
    expect(textoGuardadoEl(new Date(2026, 10, 5, 9, 12).toISOString(), ahora)).toBe(
      'el 05/11 a las 09:12',
    );
  });

  it('sin fecha o con una fecha inválida: "hace un tiempo"', () => {
    expect(textoGuardadoEl(null, ahora)).toBe('hace un tiempo');
    expect(textoGuardadoEl('no es una fecha', ahora)).toBe('hace un tiempo');
  });
});
