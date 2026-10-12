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
