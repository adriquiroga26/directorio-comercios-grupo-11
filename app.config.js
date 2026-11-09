// Configuración dinámica de Expo: toma app.json como base y le suma la clave de Google Maps.
// La clave viene de la variable de entorno GOOGLE_MAPS_API_KEY (en EAS se guarda como variable
// de entorno del proyecto), así NO queda escrita en el repositorio.
//
// Sin la clave, el mapa de Android no puede dibujarse y la app se cierra al abrirlo: por eso
// también se avisa a la app, con `extra.mapaDisponible`, si hay clave o no (ver src/constants/mapa.ts).
module.exports = ({ config }) => {
  const clave = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    android: {
      ...config.android,
      ...(clave ? { config: { googleMaps: { apiKey: clave } } } : {}),
    },
    extra: {
      ...config.extra,
      mapaDisponible: Boolean(clave),
    },
  };
};
