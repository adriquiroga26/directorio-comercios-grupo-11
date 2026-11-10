import type { Promocion } from '@/tipos';

import { fechaCorta } from './fechas';

// Los avisos de promociones: notificaciones LOCALES (las programa la propia app en el teléfono, no
// un servidor). Son de dos clases, como pide el PRD:
//   1. "Promo nueva": aparece una promoción de un comercio favorito o de un rubro de interés.
//   2. "Promo por vencer": llega un día antes de que termine.
// Acá está sólo la decisión de qué avisos hacen falta; programar y cancelar notificaciones de verdad
// está en src/avisos/notificaciones.ts. Son funciones puras.

// Cuánto antes del final llega el aviso de "por vencer".
export const ANTICIPACION_MS = 24 * 60 * 60 * 1000;
// Si faltan menos de 2 horas, ya no sirve avisar: la persona no llega a usarla.
const MINIMO_RESTANTE_MS = 2 * 60 * 60 * 1000;
// Un aviso que corresponde "ahora" sale unos segundos después, para que no salga en el mismo instante.
const DEMORA_DEL_AVISO_AHORA_MS = 10 * 1000;
// Una promo que EMPIEZA más adelante se avisa el día que empieza, pero no de madrugada: si empieza
// antes de esta hora, el aviso sale a esta hora.
const HORA_DEL_AVISO_DE_INICIO = 9;

// Los avisos llevan siempre uno de estos prefijos en su identificador: así se distinguen de
// cualquier otra notificación que pudiera programarse.
const PREFIJO = 'vence-';
const PREFIJO_NUEVA = 'nueva-';

// El identificador del aviso de "por vencer" de una promo.
export function idDeAviso(promocionId: string): string {
  return `${PREFIJO}${promocionId}`;
}

// El identificador del aviso de "promo nueva" de una promo.
export function idDeAvisoNueva(promocionId: string): string {
  return `${PREFIJO_NUEVA}${promocionId}`;
}

export function esIdDeAviso(identificador: string): boolean {
  return identificador.startsWith(PREFIJO) || identificador.startsWith(PREFIJO_NUEVA);
}

export function esIdDeAvisoNueva(identificador: string): boolean {
  return identificador.startsWith(PREFIJO_NUEVA);
}

export interface AvisoAProgramar {
  id: string; // el identificador de la notificación ("vence-pro-441" o "nueva-pro-441")
  promocionId: string;
  fecha: Date; // cuándo se muestra
  titulo: string;
  cuerpo: string;
}

export interface PlanDeAvisos {
  programar: AvisoAProgramar[];
  cancelar: string[]; // identificadores de avisos programados que ya no corresponden
  // Avisos que NO hace falta programar porque otro aviso, que sale en este mismo momento, ya dice lo
  // mismo (una promo nueva que además vence en menos de un día: un solo aviso, no dos). `de` es el
  // aviso que los cubre: sólo se anotan como "ya avisados" si ese aviso de verdad quedó programado.
  yaCubiertos: { id: string; de: string }[];
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
  // Ids de las promociones que la app YA conocía la vez anterior. Una promoción de interés que no
  // está acá es "nueva". `null` = es la primera vez de esta cuenta: lo que ya existe se anota como
  // conocido pero no se avisa (si no, al instalar la app llegarían avisos de todas las promos).
  // Si no se manda, se toma como `null`.
  vistas?: Set<string> | null;
}

// El día que empieza una promo, el aviso sale a las 9 (o a la hora de inicio, si es más tarde).
function horaDelAvisoDeInicio(inicioMs: number): Date {
  const fecha = new Date(inicioMs);
  if (fecha.getHours() < HORA_DEL_AVISO_DE_INICIO) fecha.setHours(HORA_DEL_AVISO_DE_INICIO, 0, 0, 0);
  return fecha;
}

export function planificarAvisos(datos: DatosDelPlan): PlanDeAvisos {
  const { promociones, comercios, favoritos, rubrosDeInteres, ahora, yaAvisadas, programadas } = datos;
  const vistas = datos.vistas ?? null;
  const ahoraMs = ahora.getTime();

  const programar: AvisoAProgramar[] = [];
  const yaCubiertos: { id: string; de: string }[] = [];
  // Los avisos que SÍ corresponden hoy: lo programado que no esté acá se cancela.
  const vigentes = new Set<string>();

  for (const promocion of promociones) {
    const comercio = comercios.get(promocion.comercioId);
    const interesa =
      favoritos.includes(promocion.comercioId) ||
      (comercio !== undefined && rubrosDeInteres.includes(comercio.rubroId));
    if (!interesa) continue;

    const fin = Date.parse(promocion.hasta);
    if (Number.isNaN(fin) || fin - ahoraMs < MINIMO_RESTANTE_MS) continue;

    const inicio = Date.parse(promocion.desde);
    const empiezaDespues = !Number.isNaN(inicio) && inicio > ahoraMs;
    const nombreDelComercio = comercio?.nombre ?? 'Un comercio';
    const cuerpo = `${nombreDelComercio} · hasta el ${fechaCorta(promocion.hasta)}`;

    // ---- 1) Promo nueva ----
    const idNueva = idDeAvisoNueva(promocion.id);
    vigentes.add(idNueva);
    let nuevaAhora = false;
    if (!yaAvisadas.has(idNueva)) {
      if (empiezaDespues) {
        // Todavía no empezó: se avisa el día que empieza.
        programar.push({
          id: idNueva,
          promocionId: promocion.id,
          fecha: horaDelAvisoDeInicio(inicio),
          titulo: `Empieza hoy: ${promocion.titulo}`,
          cuerpo,
        });
      } else if (vistas !== null && !vistas.has(promocion.id)) {
        // Ya está vigente y la app no la conocía: es nueva, se avisa enseguida.
        programar.push({
          id: idNueva,
          promocionId: promocion.id,
          fecha: new Date(ahoraMs + DEMORA_DEL_AVISO_AHORA_MS),
          titulo: `Nueva promo: ${promocion.titulo}`,
          cuerpo,
        });
        nuevaAhora = true;
      }
    }

    // ---- 2) Promo por vencer ----
    const idVence = idDeAviso(promocion.id);
    vigentes.add(idVence);
    // Una promo que todavía no empezó no puede "vencer pronto": se avisa cuando ya esté en marcha.
    if (empiezaDespues || yaAvisadas.has(idVence)) continue;

    // Lo ideal es un día antes del final. Si ya falta menos que eso, se avisaría enseguida.
    const ideal = fin - ANTICIPACION_MS;
    if (nuevaAhora && ideal <= ahoraMs) {
      // Sale ahora el aviso de "nueva" y la promo además vence en menos de un día: con uno alcanza.
      yaCubiertos.push({ id: idVence, de: idNueva });
      continue;
    }
    programar.push({
      id: idVence,
      promocionId: promocion.id,
      fecha: new Date(ideal > ahoraMs ? ideal : ahoraMs + DEMORA_DEL_AVISO_AHORA_MS),
      titulo: `Vence pronto: ${promocion.titulo}`,
      cuerpo,
    });
  }

  return {
    programar,
    cancelar: [...programadas].filter((id) => esIdDeAviso(id) && !vigentes.has(id)),
    yaCubiertos,
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
// (terminaron o se dieron de baja), para que la lista guardada no crezca para siempre. Vale para
// los dos tipos de aviso ("vence-…" y "nueva-…").
export function podarAvisadas(yaAvisadas: Set<string>, promociones: Promocion[]): Set<string> {
  const existentes = new Set(
    promociones.flatMap((p) => [idDeAviso(p.id), idDeAvisoNueva(p.id)]),
  );
  return new Set([...yaAvisadas].filter((id) => existentes.has(id)));
}

// Igual, para las promociones ya conocidas: se descartan las que ya no figuran.
export function podarVistas(vistas: Set<string>, promociones: Promocion[]): Set<string> {
  const existentes = new Set(promociones.map((p) => p.id));
  return new Set([...vistas].filter((id) => existentes.has(id)));
}
