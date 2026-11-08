import type { Usuario } from './usuario';

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

// La API manda `meta` con la paginación en las listas y `meta: null` en un solo recurso.
export interface RespuestaExito<T> {
  datos: T;
  meta: Meta | null;
}

export interface CuerpoError {
  codigo: string;
  mensaje: string;
}

export interface RespuestaError {
  error: CuerpoError;
}

// Lo que devuelven POST /auth/registro y POST /auth/ingreso.
export interface Sesion {
  token: string;
  usuario: Usuario;
}

// Lo que se manda para crear una cuenta (siempre nace como "vecino") y para ingresar.
export interface DatosRegistro {
  nombre: string;
  email: string;
  contrasena: string;
}

export interface DatosIngreso {
  email: string;
  contrasena: string;
}
