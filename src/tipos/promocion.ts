export interface Promocion {
  id: string;
  comercioId: string;
  titulo: string;
  detalle: string;
  descuento: number | null;
  desde: string;
  hasta: string;
  imagenUrl: string | null;
  soloApp: boolean;
  usos: number;
  activa: boolean;
}

export interface UsoDePromocion {
  id: string;
  promocionId: string;
  usuarioId: string;
  codigo: string; // lo que se muestra y se escanea
  validadoEn: string | null;
}

// Lo que el comercio manda para crear o editar una promoción. El id, el comercio y
// los usos los pone la API.
export type DatosPromocion = Pick<
  Promocion,
  'titulo' | 'detalle' | 'descuento' | 'desde' | 'hasta' | 'soloApp'
>;
