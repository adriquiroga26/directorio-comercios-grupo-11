import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { type AvisoAProgramar, esIdDeAviso } from '@/utilidades/avisos';

// Todo lo que toca a expo-notifications está en este archivo: el resto de la app sólo conoce estas
// funciones. Son notificaciones LOCALES: las programa la propia app en el teléfono y el sistema las
// muestra a su hora, aunque la app esté cerrada. No pasan por ningún servidor.

// Cuando llega una notificación con la app ABIERTA, por defecto el sistema no la muestra. Este
// "handler" le dice que sí: como un cartel arriba y en la lista de notificaciones, sin sonido.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// En Android, toda notificación pertenece a un "canal" (con su nombre en los Ajustes del teléfono).
const CANAL = 'avisos';

// Si el canal se pudo crear. `null` = todavía no se intentó. En algunas versiones de Expo Go para
// Android la creación de canales falla (el módulo nativo no la tiene disponible): en ese caso se
// sigue SIN canal propio y las notificaciones usan el que trae el sistema.
let canalDisponible: boolean | null = null;

// El último problema que dieron las notificaciones (para la pantalla de desarrollo).
let ultimoError: string | null = null;

export function ultimoErrorDeAvisos(): string | null {
  return ultimoError;
}

export function anotarError(donde: string, error: unknown) {
  ultimoError = `${donde}: ${error instanceof Error ? error.message : String(error)}`;
}

async function prepararCanal(): Promise<void> {
  if (Platform.OS !== 'android' || canalDisponible !== null) return;
  try {
    // En Android 13 o más, el sistema NO muestra el pedido de permiso si todavía no existe un canal.
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Avisos de promociones',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    canalDisponible = true;
  } catch (error) {
    canalDisponible = false;
    anotarError('crear el canal', error);
  }
}

// sin-pedir: nunca se le preguntó. denegado: dijo que no, pero se puede volver a preguntar.
// bloqueado: dijo que no y ya no se puede preguntar (sólo se cambia desde los Ajustes).
export type PermisoAvisos = 'concedido' | 'sin-pedir' | 'denegado' | 'bloqueado';

function aPermiso(respuesta: Notifications.NotificationPermissionsStatus): PermisoAvisos {
  if (respuesta.granted) return 'concedido';
  if (respuesta.status === Notifications.PermissionStatus.UNDETERMINED) return 'sin-pedir';
  return respuesta.canAskAgain ? 'denegado' : 'bloqueado';
}

// Mira el permiso SIN mostrar el cartel del sistema.
export async function leerPermisoDeAvisos(): Promise<PermisoAvisos> {
  await prepararCanal();
  return aPermiso(await Notifications.getPermissionsAsync());
}

// Pregunta por el permiso (muestra el cartel del sistema si todavía se puede).
export async function pedirPermisoDeAvisos(): Promise<PermisoAvisos> {
  await prepararCanal();
  try {
    return aPermiso(await Notifications.requestPermissionsAsync());
  } catch (error) {
    anotarError('pedir el permiso', error);
    throw error;
  }
}

// Programa un aviso para una fecha. Si ya había uno con el mismo identificador, lo reemplaza.
export async function programarAviso(aviso: AvisoAProgramar): Promise<void> {
  await prepararCanal();
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: aviso.id,
      content: {
        title: aviso.titulo,
        body: aviso.cuerpo,
        // Al tocar la notificación, la app usa este dato para abrir la promoción.
        data: { promocionId: aviso.promocionId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: aviso.fecha,
        // Sólo se indica el canal propio si se pudo crear.
        ...(canalDisponible ? { channelId: CANAL } : {}),
      },
    });
  } catch (error) {
    anotarError('programar un aviso', error);
    throw error;
  }
}

export async function cancelarAvisos(ids: string[]): Promise<void> {
  try {
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (error) {
    anotarError('cancelar avisos', error);
    throw error;
  }
}

// Todas las notificaciones programadas en el teléfono (si falla, se anota el motivo).
async function leerProgramadas() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    anotarError('leer los avisos programados', error);
    throw error;
  }
}

// Los avisos de promo que están programados ahora mismo en el teléfono.
export async function idsProgramados(): Promise<Set<string>> {
  const programadas = await leerProgramadas();
  return new Set(programadas.map((p) => p.identifier).filter(esIdDeAviso));
}

// Cancela todos los avisos de promo (por ejemplo, al apagar los avisos o cerrar la sesión).
export async function cancelarTodosLosAvisos(): Promise<void> {
  await cancelarAvisos([...(await idsProgramados())]);
}

export interface AvisoProgramado {
  id: string;
  titulo: string;
}

// Para la pantalla de desarrollo: qué hay programado.
export async function listarAvisosProgramados(): Promise<AvisoProgramado[]> {
  const programadas = await leerProgramadas();
  return programadas
    .filter((p) => esIdDeAviso(p.identifier))
    .map((p) => ({ id: p.identifier, titulo: p.content.title ?? p.identifier }));
}
