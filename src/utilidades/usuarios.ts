// Nombre + inicial del apellido, como en el mockup del PRD ("Marta G."):
// no se muestra el nombre completo de quien reseña en una lista pública.
export function nombrePublico(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] ?? '';
  return `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}
