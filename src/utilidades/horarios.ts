import type { Comercio, Horario, Temporada } from '@/tipos';

// "Abierto ahora" NO es un dato de la API: se calcula acá con la hora del
// dispositivo. Son funciones puras (reciben la fecha por parámetro) para
// poder probarlas con cualquier momento.

// Argentina no tiene horario de verano: siempre UTC-3. Se usa este offset fijo
// en vez de la zona del teléfono, para que una zona mal configurada no cambie el resultado.
const OFFSET_ARGENTINA_MS = -3 * 60 * 60 * 1000;

export const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// SUPUESTO PROVISORIO: el PRD dice "en verano" sin fechas. Se toma diciembre a febrero.
// Confirmar con el cliente / la API de la cátedra.
export function temporadaDe(ahora: Date): Temporada {
  const mes = new Date(ahora.getTime() + OFFSET_ARGENTINA_MS).getUTCMonth(); // 0 = enero
  return mes === 11 || mes === 0 || mes === 1 ? 'verano' : 'habitual';
}

export type EstadoApertura = 'abierto' | 'cerrado' | 'vacaciones' | 'inactivo';

export interface ProximaApertura {
  dia: Horario['dia'];
  hora: string; // "16:30"
  enDias: number; // 0 = hoy
}

export interface ResultadoApertura {
  estado: EstadoApertura;
  abierto: boolean;
  cierraA: string | null; // sólo si está abierto
  proximaApertura: ProximaApertura | null; // sólo si está cerrado
  vuelveEl: string | null; // ISO, sólo si está de vacaciones
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Un tramo como 22:00-02:00 cruza la medianoche.
function cruzaMedianoche(h: Horario): boolean {
  return aMinutos(h.cierra) <= aMinutos(h.abre);
}

// Si el comercio tiene tramos cargados para la temporada actual se usan sólo esos;
// si no tiene ninguno para esa temporada, se usan los habituales.
export function horariosVigentes(horarios: Horario[], temporada: Temporada): Horario[] {
  const deTemporada = horarios.filter((h) => h.temporada === temporada);
  return deTemporada.length > 0 ? deTemporada : horarios.filter((h) => h.temporada === 'habitual');
}

export function calcularApertura(
  comercio: Comercio,
  ahora: Date = new Date(),
  temporada: Temporada = temporadaDe(ahora),
): ResultadoApertura {
  const base = { abierto: false, cierraA: null, proximaApertura: null, vuelveEl: null };

  if (!comercio.activo) {
    return { ...base, estado: 'inactivo' };
  }

  if (comercio.vacaciones) {
    const desde = Date.parse(comercio.vacaciones.desde);
    const hasta = Date.parse(comercio.vacaciones.hasta);
    if (ahora.getTime() >= desde && ahora.getTime() <= hasta) {
      return { ...base, estado: 'vacaciones', vuelveEl: comercio.vacaciones.hasta };
    }
  }

  const local = new Date(ahora.getTime() + OFFSET_ARGENTINA_MS);
  const hoy = local.getUTCDay() as Horario['dia'];
  const ayer = ((hoy + 6) % 7) as Horario['dia'];
  const minutos = local.getUTCHours() * 60 + local.getUTCMinutes();
  const tramos = horariosVigentes(comercio.horarios, temporada);

  for (const t of tramos) {
    const abre = aMinutos(t.abre);
    const cierra = aMinutos(t.cierra);
    const cruza = cruzaMedianoche(t);

    const abiertoHoy = t.dia === hoy && (cruza ? minutos >= abre : minutos >= abre && minutos < cierra);
    const abiertoPorAyer = t.dia === ayer && cruza && minutos < cierra;

    if (abiertoHoy || abiertoPorAyer) {
      return { ...base, estado: 'abierto', abierto: true, cierraA: t.cierra };
    }
  }

  // Cerrado: buscar la próxima apertura dentro de los próximos 7 días.
  // (No se cruza con las vacaciones futuras: si arrancan antes de esa apertura, el dato es aproximado.)
  for (let enDias = 0; enDias <= 7; enDias++) {
    const dia = ((hoy + enDias) % 7) as Horario['dia'];
    const candidatos = tramos
      .filter((t) => t.dia === dia && (enDias > 0 || aMinutos(t.abre) > minutos))
      .sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));
    if (candidatos.length > 0) {
      return {
        ...base,
        estado: 'cerrado',
        proximaApertura: { dia, hora: candidatos[0].abre, enDias },
      };
    }
  }

  return { ...base, estado: 'cerrado' };
}

// Texto corto para la lista y la ficha, como en las pantallas del PRD.
export function textoApertura(r: ResultadoApertura): string {
  switch (r.estado) {
    case 'abierto':
      return `Abierto · cierra ${r.cierraA}`;
    case 'vacaciones':
      return 'Cerrado por vacaciones';
    case 'inactivo':
      return 'No disponible';
    case 'cerrado': {
      const p = r.proximaApertura;
      if (!p) return 'Cerrado';
      if (p.enDias === 0) return `Cerrado · abre ${p.hora}`;
      if (p.enDias === 1) return `Cerrado · abre mañana ${p.hora}`;
      return `Cerrado · abre el ${NOMBRES_DIA[p.dia]} ${p.hora}`;
    }
  }
}

export interface ResumenDia {
  dia: Horario['dia'];
  nombre: string;
  texto: string; // "08:00–12:00 y 16:30–20:30", o "Cerrado"
}

// El horario completo de la semana para la ficha del comercio, un renglón
// por día, de lunes a domingo. Usa la temporada actual por defecto, igual
// que calcularApertura.
export function resumenSemanal(
  horarios: Horario[],
  temporada: Temporada = temporadaDe(new Date()),
): ResumenDia[] {
  const vigentes = horariosVigentes(horarios, temporada);
  const ordenLunesADomingo: Horario['dia'][] = [1, 2, 3, 4, 5, 6, 0];

  return ordenLunesADomingo.map((dia) => {
    const tramosDelDia = vigentes
      .filter((h) => h.dia === dia)
      .sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));

    const texto =
      tramosDelDia.length > 0
        ? tramosDelDia.map((t) => `${t.abre}–${t.cierra}`).join(' y ')
        : 'Cerrado';

    return { dia, nombre: NOMBRES_DIA[dia], texto };
  });
}
