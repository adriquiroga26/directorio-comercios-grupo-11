import type { Comercio, DatosPromocion, Promocion } from '@/tipos';

import { pedir } from './cliente';

// Servicios del panel del comercio. Sólo los puede usar una cuenta con rol "comercio":
// una cuenta de vecino recibe SIN_PERMISO. Todos los errores llegan como ErrorApi con
// mensaje para mostrar.

// El comercio de la cuenta (la API sabe cuál es por el token).
export async function obtenerMiComercio(): Promise<Comercio> {
  const { datos } = await pedir<Comercio>('/mi-comercio');
  return datos;
}

// TODAS las promos del comercio: vigentes, próximas, vencidas y dadas de baja, cada una
// con su cantidad de usos. (A diferencia de GET /promociones, que sólo trae las que ve
// el público.) Vienen de la más nueva a la más vieja.
export async function listarMisPromociones(): Promise<Promocion[]> {
  const { datos } = await pedir<Promocion[]>('/mi-comercio/promociones?porPagina=100');
  return datos;
}

// Errores posibles: VALIDACION_FALLIDA y PROMO_VENCIDA (la fecha de fin ya pasó).
export async function crearPromocion(datos: DatosPromocion): Promise<Promocion> {
  const { datos: promocion } = await pedir<Promocion>('/mi-comercio/promociones', {
    metodo: 'POST',
    cuerpo: datos,
  });
  return promocion;
}

// Una promo vencida no se puede editar (PROMO_VENCIDA). Lo que no se manda queda igual.
export async function editarPromocion(
  promocionId: string,
  datos: Partial<DatosPromocion>,
): Promise<Promocion> {
  const { datos: promocion } = await pedir<Promocion>(
    `/mi-comercio/promociones/${encodeURIComponent(promocionId)}`,
    { metodo: 'PATCH', cuerpo: datos },
  );
  return promocion;
}

// Baja lógica: la promo deja de verse para el público (`activa: false`) pero se conserva
// con sus usos. La API responde 204 (sin cuerpo) y repetirlo no da error.
export async function darDeBajaPromocion(promocionId: string): Promise<void> {
  await pedir<null>(`/mi-comercio/promociones/${encodeURIComponent(promocionId)}`, {
    metodo: 'DELETE',
  });
}
