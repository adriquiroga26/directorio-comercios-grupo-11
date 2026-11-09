import type { Promocion } from '@/tipos';

import { fechaCorta } from './fechas';

// Los avisos de "promo por vencer": una notificación LOCAL (la programa la propia app en el
// teléfono, no un servidor) que llega un día antes de que termine una promoción de un comercio
// favorito o de un rubro de interés. Acá está sólo la decisión de qué avisos hacen falta; programar
// y cancelar notificaciones de verdad está en src/avisos/notificaciones.ts. Son funciones puras.

// Cuánto antes del final llega el aviso.
export const ANTICIPACION_MS = 24 * 60 * 60 * 1000;
// Si faltan menos de 2 horas, ya no sirve avisar: la persona no llega a usarla.
const MINIMO_RESTANTE_MS = 2 * 60 * 60 * 1000;
// Una promo que ya está dentro de las últimas 24 horas cuando se detecta se avisa "ahora"
// (en realidad unos segundos después, para que no salga en el mismo instante).
const DEMORA_DEL_AVISO_AHORA_MS = 10 * 1000;

// Los avisos de esta función llevan siempre este prefijo en su identificador, así se distinguen
// de cualquier otra notificación que pudiera programarse.
const PREFIJO = 'vence-';

export function idDeAviso(promocionId: string): string {
  return `${PREFIJO}${promocionId}`;
}

export function esIdDeAviso(identificador: string): boolean {
  return identificador.startsWith(PREFIJO);
}

export interface AvisoAProgramar {
  id: string; // el identificador de la notificación ("vence-pro-441")
  promocionId: string;
  fecha: Date; // cuándo se muestra
  titulo: string;
  cuerpo: string;
}

export interface PlanDeAvisos {
  programar: AvisoAProgramar[];
  cancelar: string[]; // identificadores de avisos programados que ya no corresponden
}

interface DatosDelPlan {
  promociones: Promocion[];
  // El comercio de cada promoción (para su nombre y su rubro), por id.
  comercios: Map<string, { nombre: string; rubroId: string }>;
  favoritos: string[]; // ids de comercios favoritos
  rubrosDeInteres: string[]; // ids de rubros
  ahora: Date;
  // Ids de aviso que ya se programaron alguna vez (hayan salido o no): sin esto, un aviso que
  // ya llegó volvería a programarse cada vez que se abre la app.
  yaAvisadas: Set<string>;
  // Ids de aviso que están programados ahora mismo en el teléfono.
  programadas: Set<string>;
}

export function planificarAvisos(datos: DatosDelPlan): PlanDeAvisos {
  const { promociones, comercios, favoritos, rubrosDeInteres, ahora, yaAvisadas, programadas } = datos;

  const programar: AvisoAProgramar[] = [];
  // Los avisos que SÍ corresponden hoy: lo programado que no esté acá se cancela.
  const vigentes = new Set<string>();

  for (const promocion of promociones) {
    const comercio = comercios.get(promocion.comercioId);
    const interesa =
      favoritos.includes(promocion.comercioId) ||
      (comercio !== undefined && rubrosDeInteres.includes(comercio.rubroId));
    if (!interesa) continue;

    const fin = Date.parse(promocion.hasta);
    if (Number.isNaN(fin) || fin - ahora.getTime() < MINIMO_RESTANTE_MS) continue;

    const id = idDeAviso(promocion.id);
    vigentes.add(id);
    if (yaAvisadas.has(id)) continue; // ya se programó (y quizás ya llegó)

    // Lo ideal es un día antes del final. Si ya falta menos que eso, se avisa enseguida.
    const ideal = fin - ANTICIPACION_MS;
    const fecha = new Date(ideal > ahora.getTime() ? ideal : ahora.getTime() + DEMORA_DEL_AVISO_AHORA_MS);

    programar.push({
      id,
      promocionId: promocion.id,
      fecha,
      titulo: `Vence pronto: ${promocion.titulo}`,
      cuerpo: `${comercio?.nombre ?? 'Un comercio'} · hasta el ${fechaCorta(promocion.hasta)}`,
    });
  }

  return {
    programar,
    cancelar: [...programadas].filter((id) => esIdDeAviso(id) && !vigentes.has(id)),
  };
}

// Lo que se guarda en el teléfono es TEXTO (una lista JSON de ids). Un texto vacío o roto no
// debe romper nada: da una lista vacía.
export function idsDeTexto(texto: string | null): Set<string> {
  if (texto === null) return new Set();
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return new Set();
    return new Set(valor.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

// Los ids ya avisados que todavía importan: se descartan los de promociones que ya no figuran
// (terminaron o se dieron de baja), para que la lista guardada no crezca para siempre.
export function podarAvisadas(yaAvisadas: Set<string>, promociones: Promocion[]): Set<string> {
  const existentes = new Set(promociones.map((p) => idDeAviso(p.id)));
  return new Set([...yaAvisadas].filter((id) => existentes.has(id)));
}
