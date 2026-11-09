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

// Lo que el vecino puede cambiar de sus avisos (PATCH /yo). Todo es opcional: lo que no se manda,
// queda igual. `rubrosDeInteres` reemplaza la lista ENTERA.
export interface CambiosDeAvisos {
  avisosActivos?: boolean;
  rubrosDeInteres?: string[];
}

// Devuelve el usuario ya actualizado. Errores posibles: RUBRO_NO_ENCONTRADO (un rubro que no
// existe) y VALIDACION_FALLIDA.
export async function actualizarMisAvisos(cambios: CambiosDeAvisos): Promise<Usuario> {
  const { datos } = await pedir<Usuario>('/yo', { metodo: 'PATCH', cuerpo: cambios });
  return datos;
}

// Los datos de la cuenta con el token vigente. Sirve para comprobar que la
// sesión guardada todavía vale y para refrescar el nombre, los favoritos, etc.
export async function obtenerMiCuenta(): Promise<Usuario> {
  const { datos } = await pedir<Usuario>('/yo');
  return datos;
}
