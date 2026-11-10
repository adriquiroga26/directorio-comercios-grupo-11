import { guardarVistas, guardarYaAvisadas, leerVistas, leerYaAvisadas } from '@/almacen/avisos';
import { listarPromociones } from '@/servicios';
import type { Comercio, Usuario } from '@/tipos';
import { esIdDeAvisoNueva, planificarAvisos, podarAvisadas, podarVistas } from '@/utilidades/avisos';

import { cancelarAvisos, idsProgramados, programarAviso } from './notificaciones';

// Deja programados los avisos de promociones que le corresponden a esta cuenta ("promo nueva" y
// "promo por vencer"): pide las promociones, decide qué hace falta (planificarAvisos) y programa lo
// nuevo y cancela lo que ya no corresponde. Necesita conexión (las promociones vienen de la API); sin
// ella, lo ya programado queda como está.
export async function sincronizarAvisos(usuario: Usuario, comercios: Comercio[]): Promise<void> {
  const [promociones, programadas] = await Promise.all([listarPromociones(), idsProgramados()]);

  const yaAvisadas = podarAvisadas(leerYaAvisadas(usuario.id), promociones);
  // `null` = la primera vez de esta cuenta: lo que ya existe se anota como conocido, sin avisar.
  const guardadas = leerVistas(usuario.id);
  const vistas = guardadas === null ? null : podarVistas(guardadas, promociones);

  const plan = planificarAvisos({
    promociones,
    comercios: new Map(comercios.map((c) => [c.id, { nombre: c.nombre, rubroId: c.rubroId }])),
    favoritos: usuario.favoritos,
    rubrosDeInteres: usuario.rubrosDeInteres,
    ahora: new Date(),
    yaAvisadas,
    programadas,
    vistas,
  });

  await cancelarAvisos(plan.cancelar);
  // Un aviso cancelado ANTES de salir no es un aviso "ya avisado": si la persona vuelve a marcar el
  // favorito o el rubro, tiene que programarse de nuevo.
  for (const id of plan.cancelar) yaAvisadas.delete(id);

  const programadosBien = new Set<string>();
  // Promociones cuyo aviso de "nueva" no se pudo programar: no se dan por conocidas, así se reintenta.
  const sinAvisar = new Set<string>();
  for (const aviso of plan.programar) {
    try {
      await programarAviso(aviso);
      // Sólo se anota como "ya avisada" si de verdad quedó programada.
      yaAvisadas.add(aviso.id);
      programadosBien.add(aviso.id);
    } catch {
      // Se vuelve a intentar la próxima vez.
      if (esIdDeAvisoNueva(aviso.id)) sinAvisar.add(aviso.promocionId);
    }
  }
  // Los avisos que otro aviso ya cubre (nueva + por vencer a la vez) se anotan como avisados.
  for (const cubierto of plan.yaCubiertos) {
    if (programadosBien.has(cubierto.de)) yaAvisadas.add(cubierto.id);
  }
  guardarYaAvisadas(usuario.id, yaAvisadas);

  // Desde ahora, todas las promociones que acabamos de ver son "conocidas".
  guardarVistas(usuario.id, new Set(promociones.filter((p) => !sinAvisar.has(p.id)).map((p) => p.id)));
}

// Saca TODOS los avisos programados (por ejemplo, al apagar los avisos o cerrar la sesión). Los que
// estaban programados y todavía no salieron se borran también de la lista de "ya avisadas" de esa
// cuenta, para que se programen de nuevo cuando vuelvan a corresponder. Los que ya salieron no están
// programados, así que siguen anotados y no se repiten.
export async function quitarAvisosProgramados(usuarioId: string | null): Promise<void> {
  const programadas = await idsProgramados();
  await cancelarAvisos([...programadas]);
  if (usuarioId === null || programadas.size === 0) return;

  const yaAvisadas = leerYaAvisadas(usuarioId);
  for (const id of programadas) yaAvisadas.delete(id);
  guardarYaAvisadas(usuarioId, yaAvisadas);
}
