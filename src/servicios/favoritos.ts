import type { Usuario } from '@/tipos';

import { pedir } from './cliente';

// Los favoritos son de la cuenta del vecino (las cuentas de comercio reciben
// SIN_PERMISO). Las dos operaciones son idempotentes: repetirlas no da error.

// Marca un comercio como favorito. La API devuelve el usuario ya actualizado,
// con la lista `favoritos` completa.
export async function agregarFavorito(comercioId: string): Promise<Usuario> {
  const { datos } = await pedir<Usuario>(`/yo/favoritos/${encodeURIComponent(comercioId)}`, {
    metodo: 'PUT',
  });
  return datos;
}

// Quita un favorito. La API responde 204 (sin cuerpo), así que no devuelve el
// usuario: quien llama actualiza la lista a mano.
export async function quitarFavorito(comercioId: string): Promise<void> {
  await pedir<null>(`/yo/favoritos/${encodeURIComponent(comercioId)}`, { metodo: 'DELETE' });
}
