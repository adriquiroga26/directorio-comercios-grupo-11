export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Horario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  abre: string; // "08:00"
  cierra: string; // "12:00"
}

// Medios de pago aceptados: el catálogo fijo que usa la API de la cátedra.
// Si la API agrega uno nuevo, va acá.
export type MedioDePago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'billetera_virtual';

// Lo que el comercio puede cambiar de su ficha con PATCH /mi-comercio. Todo es opcional: lo
// que no se manda queda como estaba. Los contactos se borran con `null`, no con "".
export interface DatosFicha {
  nombre?: string;
  descripcion?: string;
  direccion?: string;
  telefono?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  mediosDePago?: MedioDePago[];
}

export interface Comercio {
  id: string;
  nombre: string;
  rubroId: string;
  descripcion: string;
  direccion: string;
  coordenadas: Coordenadas;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  imagenes: string[];
  videoUrl: string | null;
  // Un elemento por tramo (el horario cortado son dos). La API devuelve `[]`
  // cuando el comercio está cerrado por vacaciones.
  horarios: Horario[];
  mediosDePago: MedioDePago[];
  puntaje: number;
  cantidadResenas: number;
  codigoQr: string | null;
  activo: boolean;
}
