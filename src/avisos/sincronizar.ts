import { guardarYaAvisadas, leerYaAvisadas } from '@/almacen/avisos';
import { listarPromociones } from '@/servicios';
import type { Comercio, Usuario } from '@/tipos';
import { planificarAvisos, podarAvisadas } from '@/utilidades/avisos';

import { cancelarAvisos, idsProgramados, programarAviso } from './notificaciones';

// Deja programados los avisos de "promo por vencer" que le corresponden a esta cuenta: pide las
// promociones, decide qué hace falta (planificarAvisos) y programa lo nuevo y cancela lo que ya no
// corresponde. Necesita conexión (las promociones vienen de la API); sin ella, lo ya programado
// queda como está.
export async function sincronizarAvisos(usuario: Usuario, comercios: Comercio[]): Promise<void> {
  const [promociones, programadas] = await Promise.all([listarPromociones(), idsProgramados()]);

  const yaAvisadas = podarAvisadas(leerYaAvisadas(usuario.id), promociones);
  const plan = planificarAvisos({
    promociones,
    comercios: new Map(comercios.map((c) => [c.id, { nombre: c.nombre, rubroId: c.rubroId }])),
    favoritos: usuario.favoritos,
    rubrosDeInteres: usuario.rubrosDeInteres,
    ahora: new Date(),
    yaAvisadas,
    programadas,
  });

  await cancelarAvisos(plan.cancelar);
  // Un aviso cancelado ANTES de salir no es un aviso "ya avisado": si la persona vuelve a marcar el
  // favorito o el rubro, tiene que programarse de nuevo.
  for (const id of plan.cancelar) yaAvisadas.delete(id);
  for (const aviso of plan.programar) {
    try {
      await programarAviso(aviso);
      // Sólo se anota como "ya avisada" si de verdad quedó programada.
      yaAvisadas.add(aviso.id);
    } catch {
      // Se vuelve a intentar la próxima vez.
    }
  }
  guardarYaAvisadas(usuario.id, yaAvisadas);
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
