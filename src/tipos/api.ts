export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaExito<T> {
  datos: T;
  meta?: Meta;
}

export interface CuerpoError {
  codigo: string;
  mensaje: string;
}

export interface RespuestaError {
  error: CuerpoError;
}
