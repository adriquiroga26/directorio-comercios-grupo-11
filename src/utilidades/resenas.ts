// Validación del formulario de reseña. Mismos límites que la API: de 1 a 5 estrellas
// (número entero) y un comentario de 1 a 1000 caracteres. Se revisa acá primero para
// avisar al instante; la API vuelve a validar igual.

export const LARGO_MAXIMO_COMENTARIO = 1000;

export interface CamposResena {
  estrellas: number; // 0 = todavía no eligió
  comentario: string;
}

// Largo máximo de la respuesta del comercio (el mismo tope que el comentario).
export const LARGO_MAXIMO_RESPUESTA = 1000;

// Devuelve el problema de una respuesta del comercio (texto para mostrar) o null si está bien.
export function validarRespuesta(respuesta: string): string | null {
  const texto = respuesta.trim();
  if (texto.length < 1) {
    return 'Escribí tu respuesta.';
  }
  if (texto.length > LARGO_MAXIMO_RESPUESTA) {
    return `La respuesta puede tener hasta ${LARGO_MAXIMO_RESPUESTA} caracteres.`;
  }
  return null;
}

// Devuelve el primer problema (texto para mostrar) o null si está todo bien.
export function validarResena(campos: CamposResena): string | null {
  if (!Number.isInteger(campos.estrellas) || campos.estrellas < 1 || campos.estrellas > 5) {
    return 'Elegí de 1 a 5 estrellas.';
  }

  const comentario = campos.comentario.trim();
  if (comentario.length < 1) {
    return 'Escribí un comentario.';
  }
  if (comentario.length > LARGO_MAXIMO_COMENTARIO) {
    return `El comentario puede tener hasta ${LARGO_MAXIMO_COMENTARIO} caracteres.`;
  }
  return null;
}
