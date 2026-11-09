import {
  fechaDeHora,
  horaDeFecha,
  mismosHorarios,
  validarCierre,
  validarHorarios,
} from '@/utilidades/edicionHorarios';

describe('horaDeFecha / fechaDeHora', () => {
  it('van y vuelven sin perder la hora', () => {
    expect(horaDeFecha(fechaDeHora('08:30'))).toBe('08:30');
    expect(horaDeFecha(fechaDeHora('00:05'))).toBe('00:05');
    expect(horaDeFecha(fechaDeHora('23:59'))).toBe('23:59');
  });
});

describe('validarHorarios', () => {
  it('acepta una lista vacía y tramos partidos', () => {
    expect(validarHorarios([])).toBeNull();
    expect(
      validarHorarios([
        { dia: 1, abre: '08:00', cierra: '12:00' },
        { dia: 1, abre: '16:30', cierra: '20:30' },
      ]),
    ).toBeNull();
  });

  it('un tramo tiene que abrir antes de cerrar', () => {
    expect(validarHorarios([{ dia: 2, abre: '12:00', cierra: '12:00' }])).toContain('martes');
    expect(validarHorarios([{ dia: 0, abre: '22:00', cierra: '02:00' }])).toContain('domingo');
  });

  it('dos tramos del mismo día no se pisan', () => {
    const resultado = validarHorarios([
      { dia: 3, abre: '09:00', cierra: '13:00' },
      { dia: 3, abre: '12:00', cierra: '18:00' },
    ]);
    expect(resultado).toContain('miércoles');
    expect(resultado).toContain('pisan');
  });

  it('que un tramo empiece justo cuando termina el otro está bien', () => {
    expect(
      validarHorarios([
        { dia: 4, abre: '09:00', cierra: '13:00' },
        { dia: 4, abre: '13:00', cierra: '18:00' },
      ]),
    ).toBeNull();
  });

  it('tramos de días distintos no se pisan entre sí', () => {
    expect(
      validarHorarios([
        { dia: 5, abre: '09:00', cierra: '18:00' },
        { dia: 6, abre: '09:00', cierra: '18:00' },
      ]),
    ).toBeNull();
  });

  it('rechaza más de 50 tramos', () => {
    const muchos = Array.from({ length: 51 }, () => ({ dia: 1 as const, abre: '08:00', cierra: '09:00' }));
    expect(validarHorarios(muchos)).toContain('50');
  });
});

describe('mismosHorarios', () => {
  it('ignora el orden', () => {
    const a = [
      { dia: 1 as const, abre: '08:00', cierra: '12:00' },
      { dia: 2 as const, abre: '08:00', cierra: '12:00' },
    ];
    expect(mismosHorarios(a, [a[1], a[0]])).toBe(true);
  });

  it('detecta un tramo distinto o de más', () => {
    const a = [{ dia: 1 as const, abre: '08:00', cierra: '12:00' }];
    expect(mismosHorarios(a, [{ dia: 1, abre: '08:00', cierra: '13:00' }])).toBe(false);
    expect(mismosHorarios(a, [])).toBe(false);
  });
});

describe('validarCierre', () => {
  const hoy = new Date(2026, 10, 9, 15, 0);

  it('acepta hoy y días futuros', () => {
    expect(validarCierre(new Date(2026, 10, 9, 12), hoy)).toBeNull();
    expect(validarCierre(new Date(2026, 11, 31, 12), hoy)).toBeNull();
  });

  it('rechaza un día que ya pasó', () => {
    expect(validarCierre(new Date(2026, 10, 8, 12), hoy)).toContain('ya pasó');
  });
});
