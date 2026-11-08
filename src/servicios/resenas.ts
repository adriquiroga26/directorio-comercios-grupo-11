import type { Resena } from '@/tipos';

import { pedir } from './cliente';

// Sólo lectura por ahora: crear, editar o borrar una reseña, reportarla y que el
// comercio responda necesitan una cuenta (el PRD: "la cuenta hace falta para
// dejar reseñas"). Eso llega con el registro y el ingreso.

export interface ResenaConAutor extends Resena {
  nombreAutor: string;
}

// La API devuelve las reseñas de la más nueva a la más vieja, pero sólo trae el
// `usuarioId` del autor: no hay ningún endpoint para pedir el nombre de otra
// persona. Por eso todas salen como "Vecino/a" (hueco entre el PRD, que muestra
// "Marta G.", y la API). Con una cuenta iniciada, las propias llevarán el nombre.
export async function listarResenasDeComercio(comercioId: string): Promise<ResenaConAutor[]> {
  const { datos } = await pedir<Resena[]>(
    `/comercios/${encodeURIComponent(comercioId)}/resenas?porPagina=100`,
  );
  return datos.map((resena) => ({ ...resena, nombreAutor: 'Vecino/a' }));
}
