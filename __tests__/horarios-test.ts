// "Abierto ahora" no es un dato de la API: se calcula acá con la hora del
// dispositivo (ver src/utilidades/horarios.ts). Estos tests fijan la fecha
// con new Date(isoString) para no depender de cuándo se corre el test.
import { comerciosMock } from '@/mocks';
import type { Comercio, Horario } from '@/tipos';
import { calcularApertura, textoApertura } from '@/utilidades/horarios';

function comercio(id: string): Comercio {
  const encontrado = comerciosMock.find((c) => c.id === id);
  if (!encontrado) throw new Error(`No existe el mock "${id}"`);
  return encontrado;
}

function textoEn(c: Comercio, fechaISO: string): string {
  return textoApertura(calcularApertura(c, new Date(fechaISO)));
}

describe('calcularApertura — horario habitual (El Tornillo, L-V 08-12 y 16:30-20:30, sáb 08-13)', () => {
  // 2026-09-24 es jueves.
  it('está abierto en el turno mañana', () => {
    expect(textoEn(comercio('com-118'), '2026-09-24T10:00:00-03:00')).toBe('Abierto · cierra 12:00');
  });

  it('a la hora exacta de cierre ya está cerrado (el límite no incluye)', () => {
    expect(textoEn(comercio('com-118'), '2026-09-24T12:00:00-03:00')).toBe('Cerrado · abre 16:30');
  });

  it('en el corte del mediodía muestra cuándo abre el turno tarde', () => {
    expect(textoEn(comercio('com-118'), '2026-09-24T14:00:00-03:00')).toBe('Cerrado · abre 16:30');
  });

  it('a la hora exacta de apertura ya está abierto (el límite sí incluye)', () => {
    expect(textoEn(comercio('com-118'), '2026-09-24T16:30:00-03:00')).toBe('Abierto · cierra 20:30');
  });

  it('de noche avisa que abre al día siguiente', () => {
    expect(textoEn(comercio('com-118'), '2026-09-24T21:00:00-03:00')).toBe('Cerrado · abre mañana 08:00');
  });

  it('el sábado tiene un solo turno corrido hasta las 13', () => {
    expect(textoEn(comercio('com-118'), '2026-09-26T10:00:00-03:00')).toBe('Abierto · cierra 13:00');
  });

  it('el sábado a la tarde ya cerró y no vuelve a abrir hasta el lunes', () => {
    expect(textoEn(comercio('com-118'), '2026-09-26T13:30:00-03:00')).toBe('Cerrado · abre el lunes 08:00');
  });

  it('el domingo está cerrado', () => {
    expect(textoEn(comercio('com-118'), '2026-09-27T10:00:00-03:00')).toBe('Cerrado · abre mañana 08:00');
  });

  it('calcula en hora de Argentina (UTC-3) sin importar la zona del string de entrada', () => {
    // 13:00 UTC == 10:00 en Argentina: mismo resultado que el primer test.
    expect(textoEn(comercio('com-118'), '2026-09-24T13:00:00Z')).toBe('Abierto · cierra 12:00');
  });
});

describe('calcularApertura — horario de verano (diciembre a febrero)', () => {
  // 2026-01-14 es miércoles. En verano el turno tarde de El Tornillo empieza 17:30 (no 16:30).
  it('a las 17:00 todavía no abrió el turno tarde de verano', () => {
    expect(textoEn(comercio('com-118'), '2026-01-14T17:00:00-03:00')).toBe('Cerrado · abre 17:30');
  });

  it('a las 17:30 ya abrió con el horario de verano', () => {
    expect(textoEn(comercio('com-118'), '2026-01-14T17:30:00-03:00')).toBe('Abierto · cierra 21:30');
  });

  it('si el comercio no tiene tramos cargados para verano, usa el horario habitual', () => {
    expect(textoEn(comercio('com-201'), '2026-01-14T16:45:00-03:00')).toBe('Abierto · cierra 20:30');
  });
});

describe('calcularApertura — vacaciones (Tienda Pequeños Pasos, 20/09 al 31/12/2026)', () => {
  it('está cerrado por vacaciones aunque sea horario habitual de atención', () => {
    expect(textoEn(comercio('com-412'), '2026-09-24T10:00:00-03:00')).toBe('Cerrado por vacaciones');
  });

  it('vuelve a abrir normalmente después de la fecha de regreso', () => {
    expect(textoEn(comercio('com-412'), '2027-01-04T10:00:00-03:00')).toBe('Abierto · cierra 12:30');
  });
});

describe('calcularApertura — comercio sin horario cargado un día (Librería Don Quijote no abre sábados)', () => {
  it('el sábado avisa que abre el lunes', () => {
    expect(textoEn(comercio('com-305'), '2026-09-26T10:00:00-03:00')).toBe('Cerrado · abre el lunes 08:30');
  });
});

describe('calcularApertura — comercio inactivo (El Aula)', () => {
  it('nunca se muestra como abierto', () => {
    expect(textoEn(comercio('com-606'), '2026-09-24T10:00:00-03:00')).toBe('No disponible');
  });
});

describe('calcularApertura — tramo que cruza la medianoche', () => {
  // Turno ficticio de bar: viernes 22:00 a sábado 02:00.
  const horarioBar: Horario = { dia: 5, abre: '22:00', cierra: '02:00', temporada: 'habitual' };
  const bar: Comercio = { ...comercio('com-118'), horarios: [horarioBar] };

  it('está abierto el viernes a la noche', () => {
    expect(textoEn(bar, '2026-09-25T23:00:00-03:00')).toBe('Abierto · cierra 02:00');
  });

  it('sigue abierto pasada la medianoche, ya sábado', () => {
    expect(textoEn(bar, '2026-09-26T01:00:00-03:00')).toBe('Abierto · cierra 02:00');
  });

  it('a las 02:00 del sábado ya cerró', () => {
    expect(textoEn(bar, '2026-09-26T02:00:00-03:00')).toBe('Cerrado · abre el viernes 22:00');
  });
});
