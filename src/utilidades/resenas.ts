// Validación del formulario de reseña. Mismos límites que la API: de 1 a 5 estrellas
// (número entero) y un comentario de 1 a 1000 caracteres. Se revisa acá primero para
// avisar al instante; la API vuelve a validar igual.

export const LARGO_MAXIMO_COMENTARIO = 1000;

export interface CamposResena {
  estrellas: number; // 0 = todavía no eligió
  comentario: string;
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
