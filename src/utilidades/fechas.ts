// Recortan el texto ISO directamente en vez de pasar por un Date, para no
// depender de en qué huso horario esté corriendo el teléfono: la fecha ya
// viene escrita en el string, no hace falta "calcularla" de nuevo.

// "2026-09-30T23:59:00-03:00" -> "30/09"
export function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

// "2026-09-30T23:59:00-03:00" -> "30/09/2026"
export function fechaConAnio(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// Un Date que el usuario eligió en el calendario -> "30/09/2026". Se arma con el día,
// mes y año tal como los eligió (hora local del teléfono), sin conversiones de huso.
export function diaDeFecha(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

// "Clave" del día para compararlo: "2026-09-30". Es texto con el año primero, así que
// comparar dos claves como texto da el mismo orden que comparar las fechas.
export function claveDelDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// "2026-09-30T23:59:00-03:00" -> un Date de ese día (a mediodía, para que ningún huso
// horario lo corra de día). Sirve para llenar el calendario al editar.
export function fechaDeIso(iso: string): Date {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia, 12);
}
