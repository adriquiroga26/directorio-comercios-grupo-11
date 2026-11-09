import type { ResenaPendiente } from '@/tipos';

import { abrirBase } from './baseDeDatos';

// La cola de reseñas escritas sin conexión, en la tabla `resenas_pendientes` de SQLite. Las
// columnas de la base van en snake_case (usuario_id) y las del código en camelCase (usuarioId):
// `aResena` hace la traducción.

interface Fila {
  id: string;
  usuario_id: string;
  comercio_id: string;
  estrellas: number;
  comentario: string;
  creada_en: string;
  error: string | null;
}

function aResena(fila: Fila): ResenaPendiente {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    comercioId: fila.comercio_id,
    estrellas: fila.estrellas as ResenaPendiente['estrellas'],
    comentario: fila.comentario,
    creadaEn: fila.creada_en,
    error: fila.error,
  };
}

export async function guardarPendiente(resena: ResenaPendiente): Promise<void> {
  const base = await abrirBase();
  await base.runAsync(
    `INSERT INTO resenas_pendientes (id, usuario_id, comercio_id, estrellas, comentario, creada_en, error)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    resena.id,
    resena.usuarioId,
    resena.comercioId,
    resena.estrellas,
    resena.comentario,
    resena.creadaEn,
    resena.error,
  );
}

// Las pendientes de UNA cuenta (cada una ve sólo las suyas), de la más vieja a la más nueva: se
// envían en el mismo orden en que se escribieron.
export async function listarPendientes(usuarioId: string): Promise<ResenaPendiente[]> {
  const base = await abrirBase();
  const filas = await base.getAllAsync<Fila>(
    'SELECT * FROM resenas_pendientes WHERE usuario_id = ? ORDER BY creada_en, id',
    usuarioId,
  );
  return filas.map(aResena);
}

export async function borrarPendiente(id: string): Promise<void> {
  const base = await abrirBase();
  await base.runAsync('DELETE FROM resenas_pendientes WHERE id = ?', id);
}

// La API la rechazó para siempre: se conserva (para avisar el motivo) pero no se reintenta.
export async function marcarRechazada(id: string, mensaje: string): Promise<void> {
  const base = await abrirBase();
  await base.runAsync('UPDATE resenas_pendientes SET error = ? WHERE id = ?', mensaje, id);
}
