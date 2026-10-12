import type { Resena } from '@/tipos';

// Nota: com-305 no tiene reseñas a propósito.
export const resenasMock: Resena[] = [
  {
    id: 'res-2210',
    comercioId: 'com-118',
    usuarioId: 'usr-512',
    estrellas: 5,
    comentario: 'Tenían el tornillo raro que no conseguía en ningún lado.',
    respuesta: '¡Gracias Marta! Siempre a las órdenes.',
    reportada: false,
    creadaEn: '2026-09-10T17:05:00-03:00',
    sincronizada: true,
  },
  {
    id: 'res-2211',
    comercioId: 'com-118',
    usuarioId: 'usr-700',
    estrellas: 3,
    comentario: 'Buena atención, pero llegué y ya habían cerrado.',
    respuesta: null,
    reportada: false,
    creadaEn: '2026-09-15T12:20:00-03:00',
    sincronizada: true,
  },
  // Pendiente de subir (creada sin conexión).
  {
    id: 'res-local-1',
    comercioId: 'com-201',
    usuarioId: 'usr-512',
    estrellas: 5,
    comentario: 'Las mejores facturas de la ciudad.',
    respuesta: null,
    reportada: false,
    creadaEn: '2026-09-23T09:40:00-03:00',
    sincronizada: false,
  },
];
