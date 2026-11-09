import type { Comercio, DatosFicha, MedioDePago } from '@/tipos';

// Edición de la ficha del comercio: los límites son los mismos que usa la API (se revisa
// acá primero para avisar al instante; la API vuelve a validar igual).

export const LARGO_MAXIMO_NOMBRE = 120;
export const LARGO_MAXIMO_DESCRIPCION = 2000;
export const LARGO_MAXIMO_DIRECCION = 160;
export const LARGO_MAXIMO_TELEFONO = 40;

// Los cinco medios que acepta la API, en el orden en que se muestran.
export const MEDIOS_DE_PAGO: MedioDePago[] = [
  'efectivo',
  'debito',
  'credito',
  'transferencia',
  'billetera_virtual',
];

export const ETIQUETA_MEDIO_DE_PAGO: Record<MedioDePago, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  billetera_virtual: 'Billetera virtual',
};

// Lo que el formulario tiene en pantalla. Los campos opcionales son texto: vacío = "no tiene".
export interface CamposFicha {
  nombre: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  whatsapp: string;
  instagram: string;
  mediosDePago: MedioDePago[];
}

// Los campos del formulario con lo que el comercio tiene hoy guardado.
export function camposDeComercio(comercio: Comercio): CamposFicha {
  return {
    nombre: comercio.nombre,
    descripcion: comercio.descripcion,
    direccion: comercio.direccion,
    telefono: comercio.telefono ?? '',
    whatsapp: comercio.whatsapp ?? '',
    instagram: comercio.instagram ?? '',
    mediosDePago: comercio.mediosDePago,
  };
}

// Devuelve el primer problema (texto para mostrar) o null si está todo bien.
export function validarFicha(campos: CamposFicha): string | null {
  const nombre = campos.nombre.trim();
  if (nombre.length < 1 || nombre.length > LARGO_MAXIMO_NOMBRE) {
    return `El nombre tiene que tener entre 1 y ${LARGO_MAXIMO_NOMBRE} letras.`;
  }

  const descripcion = campos.descripcion.trim();
  if (descripcion.length < 1 || descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
    return `La descripción tiene que tener entre 1 y ${LARGO_MAXIMO_DESCRIPCION} letras.`;
  }

  const direccion = campos.direccion.trim();
  if (direccion.length < 1 || direccion.length > LARGO_MAXIMO_DIRECCION) {
    return `La dirección tiene que tener entre 1 y ${LARGO_MAXIMO_DIRECCION} letras.`;
  }

  // Los tres siguientes son opcionales: vacíos están bien.
  if (campos.telefono.trim().length > LARGO_MAXIMO_TELEFONO) {
    return `El teléfono puede tener hasta ${LARGO_MAXIMO_TELEFONO} caracteres.`;
  }

  const whatsapp = campos.whatsapp.trim();
  if (whatsapp !== '' && !/^\d{10,15}$/.test(whatsapp)) {
    return 'El WhatsApp tiene que ser sólo números, con el código de país (por ejemplo 5493442421000).';
  }

  const instagram = campos.instagram.trim();
  if (instagram !== '' && !/^@[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    return 'El Instagram tiene que empezar con @, por ejemplo @eltornillo.';
  }

  return null;
}

// Un campo opcional vacío se manda como null (así la API lo borra); nunca como "".
function textoOpcional(texto: string): string | null {
  const limpio = texto.trim();
  return limpio === '' ? null : limpio;
}

function mismosMedios(a: MedioDePago[], b: MedioDePago[]): boolean {
  return a.length === b.length && a.every((medio) => b.includes(medio));
}

// Arma el PATCH con SOLO lo que cambió respecto de lo guardado. Se manda así a propósito: lo
// que no se manda, la API lo deja como está (por ejemplo los horarios).
export function cambiosDeFicha(original: Comercio, campos: CamposFicha): DatosFicha {
  const cambios: DatosFicha = {};

  if (campos.nombre.trim() !== original.nombre) cambios.nombre = campos.nombre.trim();
  if (campos.descripcion.trim() !== original.descripcion) {
    cambios.descripcion = campos.descripcion.trim();
  }
  if (campos.direccion.trim() !== original.direccion) cambios.direccion = campos.direccion.trim();

  const telefono = textoOpcional(campos.telefono);
  if (telefono !== original.telefono) cambios.telefono = telefono;
  const whatsapp = textoOpcional(campos.whatsapp);
  if (whatsapp !== original.whatsapp) cambios.whatsapp = whatsapp;
  const instagram = textoOpcional(campos.instagram);
  if (instagram !== original.instagram) cambios.instagram = instagram;

  if (!mismosMedios(campos.mediosDePago, original.mediosDePago)) {
    cambios.mediosDePago = campos.mediosDePago;
  }

  return cambios;
}
