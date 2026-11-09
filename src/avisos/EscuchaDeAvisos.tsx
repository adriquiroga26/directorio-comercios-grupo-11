import { useLastNotificationResponse } from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSesion } from '@/sesion/SesionProvider';

// El último toque que ya se atendió (una clave con el id y la hora de la notificación). Sirve para
// abrir la promo UNA vez por cada toque, aunque el efecto vuelva a correr por otro motivo.
let toqueAtendido = '';

// Qué pasa cuando la persona TOCA un aviso: se abre la promoción de la que habla. Funciona también
// si la app estaba cerrada (el sistema la abre y este hook recibe el toque al arrancar): en ese caso
// hay que esperar a que la sesión esté leída y la navegación lista antes de abrir la pantalla.
// No dibuja nada: sólo escucha.
export function EscuchaDeAvisos() {
  const router = useRouter();
  const { estado } = useSesion();
  // Vale algo (tiene `key`) recién cuando la navegación de la app ya está armada.
  const navegacion = useRootNavigationState();
  const navegacionLista = navegacion?.key !== undefined;
  // La última notificación tocada (undefined mientras no hubo ninguna).
  const respuesta = useLastNotificationResponse();

  useEffect(() => {
    if (!respuesta || !navegacionLista) return;
    // Con la sesión bloqueada las pantallas de la app no existen todavía (ver el layout raíz).
    // Cuando se desbloquee, `estado` cambia, este efecto vuelve a correr y se abre la promo.
    if (estado === 'bloqueada' || estado === 'cargando') return;

    const dato = respuesta.notification.request.content.data as { promocionId?: unknown };
    if (typeof dato.promocionId !== 'string') return;

    const clave = `${respuesta.notification.request.identifier}|${respuesta.notification.date}`;
    if (clave === toqueAtendido) return;

    try {
      router.push({ pathname: '/promociones/[id]', params: { id: dato.promocionId } });
      toqueAtendido = clave;
    } catch {
      // Si todavía no se puede navegar, se vuelve a intentar cuando cambie algo de lo de arriba.
    }
  }, [respuesta, estado, navegacionLista, router]);

  return null;
}
