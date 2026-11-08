// Validación de los formularios de ingreso y registro. Son los mismos límites que
// aplica la API (nombre de 1 a 80 letras, email válido de hasta 254 caracteres,
// contraseña de 8 a 100): se revisan acá primero para avisar antes de hacer el pedido.
// La API vuelve a validar igual, porque el servidor nunca confía en el teléfono.

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CamposCuenta {
  nombre: string;
  email: string;
  contrasena: string;
}

// Devuelve el primer problema que encuentra (texto para mostrar) o null si está todo bien.
// `pideNombre` es true en el registro y false en el ingreso.
export function validarCuenta(campos: CamposCuenta, pideNombre: boolean): string | null {
  const nombre = campos.nombre.trim();
  const email = campos.email.trim();

  if (pideNombre && (nombre.length < 1 || nombre.length > 80)) {
    return 'El nombre tiene que tener entre 1 y 80 letras.';
  }
  if (!FORMATO_EMAIL.test(email) || email.length > 254) {
    return 'El email no es válido.';
  }
  if (campos.contrasena.length < 8) {
    return 'La contraseña tiene que tener al menos 8 caracteres.';
  }
  if (campos.contrasena.length > 100) {
    return 'La contraseña puede tener como máximo 100 caracteres.';
  }
  return null;
}
