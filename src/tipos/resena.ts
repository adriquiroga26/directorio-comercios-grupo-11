// Una reseña escrita en el teléfono que todavía no se pudo enviar a la API (sin conexión).
// Espera en la base local hasta que vuelva internet. El `id` lo genera el teléfono y la API lo
// usa para no duplicarla si se reenvía.
export interface ResenaPendiente {
  id: string;
  usuarioId: string;
  comercioId: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  comentario: string;
  creadaEn: string;
  // null: espera su turno. Con texto: la API la rechazó por un motivo definitivo (por ejemplo,
  // "Ya dejaste una reseña para este comercio") y no se va a reintentar.
  error: string | null;
}

export interface Resena {
  id: string;
  comercioId: string;
  usuarioId: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  comentario: string;
  respuesta: string | null;
  reportada: boolean;
  creadaEn: string;
  sincronizada: boolean;
}
