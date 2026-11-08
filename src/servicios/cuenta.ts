import type { DatosIngreso, DatosRegistro, Sesion, Usuario } from '@/tipos';

import { pedir } from './cliente';

// Crea una cuenta de vecino (las de comercio las da de alta el Centro Comercial).
// Errores posibles: EMAIL_YA_REGISTRADO y VALIDACION_FALLIDA, con mensaje para mostrar.
export async function crearCuenta(datos: DatosRegistro): Promise<Sesion> {
  const { datos: sesion } = await pedir<Sesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: datos,
  });
  return sesion;
}

// Error posible: CREDENCIALES_INVALIDAS (email o contraseña incorrectos).
export async function iniciarSesion(datos: DatosIngreso): Promise<Sesion> {
  const { datos: sesion } = await pedir<Sesion>('/auth/ingreso', {
    metodo: 'POST',
    cuerpo: datos,
  });
  return sesion;
}

// Los datos de la cuenta con el token vigente. Sirve para comprobar que la
// sesión guardada todavía vale y para refrescar el nombre, los favoritos, etc.
export async function obtenerMiCuenta(): Promise<Usuario> {
  const { datos } = await pedir<Usuario>('/yo');
  return datos;
}
