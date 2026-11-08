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
