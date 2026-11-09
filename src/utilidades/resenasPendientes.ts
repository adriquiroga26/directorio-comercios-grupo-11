// El id de una reseña lo genera el TELÉFONO (no la API) para poder escribirla sin conexión. La
// API lo usa como clave: si el mismo id llega dos veces (por ejemplo, el envío salió pero la
// respuesta se perdió), no crea dos reseñas. Su formato lo define la API: "res-" más 3 a 36
// letras, números, "_" o "-".
export const FORMATO_ID_RESENA = /^res-[A-Za-z0-9_-]{3,36}$/;

// `ahora` y `azar` se reciben por parámetro para poder probar la función.
export function nuevoIdDeResena(
  ahora: number = Date.now(),
  azar: () => number = Math.random,
): string {
  // La hora en base 36 hace que dos ids de momentos distintos nunca coincidan; las 10 letras
  // al azar separan dos reseñas escritas en el mismo milisegundo.
  const alAzar = Array.from({ length: 10 }, () => Math.floor(azar() * 36).toString(36)).join('');
  return `res-${ahora.toString(36)}${alAzar}`;
}
