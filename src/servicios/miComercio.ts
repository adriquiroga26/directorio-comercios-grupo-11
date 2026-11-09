import type { Comercio, DatosPromocion, Promocion, UsoDePromocion } from '@/tipos';

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

// Registra que un cliente usó una promo: el comercio manda el código que le muestra el
// cliente (o que escanea de su QR) y la API devuelve el uso con `validadoEn`, y suma uno a
// los usos de la promo. La API acepta el código con espacios o en minúsculas.
// Errores posibles (con mensaje para mostrar): CODIGO_INVALIDO, CODIGO_YA_VALIDADO,
// PROMO_DE_OTRO_COMERCIO, PROMO_VENCIDA y PROMO_NO_EMPEZO.
export async function validarCodigo(codigo: string): Promise<UsoDePromocion> {
  const { datos } = await pedir<UsoDePromocion>('/mi-comercio/usos/validar', {
    metodo: 'POST',
    cuerpo: { codigo },
  });
  return datos;
}

// Baja lógica: la promo deja de verse para el público (`activa: false`) pero se conserva
// con sus usos. La API responde 204 (sin cuerpo) y repetirlo no da error.
export async function darDeBajaPromocion(promocionId: string): Promise<void> {
  await pedir<null>(`/mi-comercio/promociones/${encodeURIComponent(promocionId)}`, {
    metodo: 'DELETE',
  });
}
