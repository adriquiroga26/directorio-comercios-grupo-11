export interface Coordenadas {
  latitud: number;
  longitud: number;
}

// Temporada agregada tras la respuesta del profe (el PRD original no la tiene).
// Valores provisorios hasta que la cátedra entregue la API.
export type Temporada = 'habitual' | 'verano';

export interface Horario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  abre: string; // "08:00"
  cierra: string; // "12:00"
  temporada: Temporada; // AGREGADO (consulta al profe)
}

// AGREGADO (consulta al profe): período de cierre por vacaciones.
export interface Vacaciones {
  desde: string; // ISO 8601 con zona
  hasta: string; // ISO 8601 con zona
}

// Medios de pago aceptados. Si se agrega uno nuevo, va acá.
export type MedioDePago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mercadopago';

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
  horarios: Horario[];
  mediosDePago: MedioDePago[];
  puntaje: number;
  cantidadResenas: number;
  codigoQr: string | null;
  activo: boolean;
  vacaciones: Vacaciones | null; // AGREGADO (consulta al profe)
}
