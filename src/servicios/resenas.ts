import type { Resena } from '@/tipos';

import { pedir } from './cliente';

export interface ResenaConAutor extends Resena {
  nombreAutor: string;
}

// Lo que se manda para escribir o editar una reseña. La fecha y el autor los
// pone la API (el autor sale del token).
export type DatosResena = Pick<Resena, 'estrellas' | 'comentario'>;

// La API devuelve las reseñas de la más nueva a la más vieja, pero sólo trae el
// `usuarioId` del autor: no hay ningún endpoint para pedir el nombre de otra
// persona. Por eso todas salen como "Vecino/a" (hueco entre el PRD, que muestra
// "Marta G.", y la API). La pantalla cambia el nombre en las reseñas propias.
export async function listarResenasDeComercio(comercioId: string): Promise<ResenaConAutor[]> {
  const { datos } = await pedir<Resena[]>(
    `/comercios/${encodeURIComponent(comercioId)}/resenas?porPagina=100`,
  );
  return datos.map((resena) => ({ ...resena, nombreAutor: 'Vecino/a' }));
}

// Escribir, editar, borrar y reportar necesitan una cuenta (el PRD: "la cuenta hace
// falta para dejar reseñas"). Todos los errores llegan como ErrorApi con mensaje para
// mostrar. Al crear, la API también recalcula el puntaje y la cantidad del comercio.

// Sólo vecinos, y una reseña por vecino y comercio (RESENA_YA_EXISTE si ya dejó una).
export async function crearResena(comercioId: string, datos: DatosResena): Promise<Resena> {
  const { datos: resena } = await pedir<Resena>(
    `/comercios/${encodeURIComponent(comercioId)}/resenas`,
    { metodo: 'POST', cuerpo: datos },
  );
  return resena;
}

// Sólo el autor. La respuesta del comercio, si había, se conserva.
export async function editarResena(resenaId: string, datos: DatosResena): Promise<Resena> {
  const { datos: resena } = await pedir<Resena>(`/resenas/${encodeURIComponent(resenaId)}`, {
    metodo: 'PATCH',
    cuerpo: datos,
  });
  return resena;
}

// Sólo el autor. La API responde 204 (sin cuerpo).
export async function borrarResena(resenaId: string): Promise<void> {
  await pedir<null>(`/resenas/${encodeURIComponent(resenaId)}`, { metodo: 'DELETE' });
}

// Cualquier cuenta menos la del autor (REPORTE_PROPIO). La reseña sigue visible, con
// `reportada: true`. Repetirlo no da error.
export async function reportarResena(resenaId: string): Promise<Resena> {
  const { datos } = await pedir<Resena>(`/resenas/${encodeURIComponent(resenaId)}/reportes`, {
    metodo: 'POST',
  });
  return datos;
}
