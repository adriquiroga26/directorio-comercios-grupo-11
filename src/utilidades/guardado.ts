// El texto que dice cuándo se bajaron los datos que la app tiene guardados, para avisar que
// pueden estar viejos: "hoy a las 14:30", "ayer a las 18:05" o "el 05/11 a las 09:12".
// Usa la hora del teléfono (es la que la persona tiene en su reloj). `ahora` se recibe por
// parámetro para poder probarla con cualquier momento.

function dosCifras(numero: number): string {
  return String(numero).padStart(2, '0');
}

function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

export function textoGuardadoEl(iso: string | null, ahora: Date = new Date()): string {
  if (iso === null) return 'hace un tiempo';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'hace un tiempo';

  const hora = `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`;
  // Se comparan días calendario (no "hace 24 horas"): a las 00:10 lo de las 23:50 es "ayer".
  const diasDeDiferencia = Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / 86_400_000);

  if (diasDeDiferencia === 0) return `hoy a las ${hora}`;
  if (diasDeDiferencia === 1) return `ayer a las ${hora}`;
  return `el ${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)} a las ${hora}`;
}
