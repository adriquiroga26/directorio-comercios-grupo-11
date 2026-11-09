import Constants, { ExecutionEnvironment } from 'expo-constants';

// ¿Se puede mostrar el mapa? En Android, el mapa (Google Maps) necesita una clave de API dentro de
// la app; si falta, la app se CIERRA apenas se crea el mapa. Hay dos casos en los que el mapa es
// seguro:
//  - La app se abre dentro de Expo Go: usa la clave de Expo.
//  - La app se compiló CON clave: app.config.js lo anota en `extra.mapaDisponible`.
// En cualquier otro caso (por ejemplo, un APK compilado sin clave), la pestaña Mapa muestra un aviso
// y la lista de comercios en lugar del mapa.
export const MAPA_DISPONIBLE =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.expoConfig?.extra?.mapaDisponible === true;
