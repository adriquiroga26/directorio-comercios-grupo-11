import type { Promocion } from '@/tipos';

export const promocionesMock: Promocion[] = [
  // Vigente y exclusiva de la app (ejemplo del PRD).
  {
    id: 'pro-441',
    comercioId: 'com-118',
    titulo: '15% en pinturas',
    detalle: 'No acumulable con otras promociones. Hasta agotar stock.',
    descuento: 15,
    desde: '2026-09-01T00:00:00-03:00',
    hasta: '2026-09-30T23:59:00-03:00',
    imagenUrl: null,
    soloApp: true,
    usos: 27,
    activa: true,
  },
  // Por empezar.
  {
    id: 'pro-442',
    comercioId: 'com-201',
    titulo: '2x1 en medialunas',
    detalle: 'Sólo de lunes a miércoles por la mañana.',
    descuento: null,
    desde: '2026-10-01T00:00:00-03:00',
    hasta: '2026-10-15T23:59:00-03:00',
    imagenUrl: null,
    soloApp: false,
    usos: 0,
    activa: true,
  },
  // Caso feo: VENCIDA. No se debe mostrar.
  {
    id: 'pro-380',
    comercioId: 'com-530',
    titulo: '20% en perfumería',
    detalle: 'Promoción de primavera.',
    descuento: 20,
    desde: '2026-08-01T00:00:00-03:00',
    hasta: '2026-08-31T23:59:00-03:00',
    imagenUrl: null,
    soloApp: false,
    usos: 64,
    activa: true, // sigue "activa" pero ya venció: la app debe filtrarla por fecha
  },
];
