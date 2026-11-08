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
