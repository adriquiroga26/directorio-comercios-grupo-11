import Storage from 'expo-sqlite/kv-store';

import {
  leerPreferenciasDeTexto,
  PREFERENCIAS_POR_DEFECTO,
  type PreferenciasBusqueda,
} from '@/utilidades/preferencias';

// Las preferencias de búsqueda, en el kv-store de expo-sqlite: un almacén de clave y valor para
// datos chicos y sueltos (acá, un solo texto JSON). Se usan las versiones SÍNCRONAS (getItemSync
// y setItemSync) porque la pantalla necesita el valor guardado en el mismo instante en que
// arranca, sin esperar una respuesta ni mostrar primero los filtros "vacíos".
const CLAVE = 'preferencias.busqueda';

export function leerPreferenciasBusqueda(): PreferenciasBusqueda {
  try {
    return leerPreferenciasDeTexto(Storage.getItemSync(CLAVE));
  } catch {
    // Si el almacén falla, la app sigue con los valores por defecto.
    return PREFERENCIAS_POR_DEFECTO;
  }
}

export function guardarPreferenciasBusqueda(preferencias: PreferenciasBusqueda): void {
  try {
    Storage.setItemSync(CLAVE, JSON.stringify(preferencias));
  } catch {
    // Recordar los filtros es un extra: si no se puede guardar, no pasa nada.
  }
}
