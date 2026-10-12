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
