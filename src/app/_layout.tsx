import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SesionProvider, useSesion } from '@/sesion/SesionProvider';

// Layout raíz: define el tema, la sesión y qué pantallas existen en cada momento.
// El splash nativo se queda a la vista hasta que se sabe si hay una sesión guardada.
SplashScreen.preventAutoHideAsync();

// Va adentro del SesionProvider porque necesita leer la sesión con useSesion().
function Navegacion() {
  const { estado, usuario } = useSesion();

  useEffect(() => {
    if (estado !== 'cargando') SplashScreen.hideAsync();
  }, [estado]);

  // Mientras se lee el almacén no se muestra nada: se ve el splash.
  if (estado === 'cargando') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Stack.Protected: si el guard es falso, esas rutas NO existen. Con la sesión
          bloqueada sólo existe la pantalla de bloqueo, así que no se puede entrar a
          la app ni escribiendo la dirección de otra pantalla. */}
      <Stack.Protected guard={estado === 'bloqueada'}>
        <Stack.Screen name="bloqueo" />
      </Stack.Protected>

      <Stack.Protected guard={estado !== 'bloqueada'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="comercios/[id]" />
        <Stack.Screen name="promociones/[id]" />
        {/* Se abre como modal (sube desde abajo): es un formulario que se completa o se cancela. */}
        <Stack.Screen name="resena/[comercioId]" options={{ presentation: 'modal' }} />
      </Stack.Protected>

      {/* Rutas protegidas por ROL: el panel del comercio sólo existe si la sesión está
          abierta y la cuenta es de comercio. Un vecino no llega ni escribiendo la dirección. */}
      <Stack.Protected guard={estado === 'con-sesion' && usuario?.rol === 'comercio'}>
        <Stack.Screen name="mi-comercio/promociones" />
        <Stack.Screen name="mi-comercio/promocion" options={{ presentation: 'modal' }} />
        <Stack.Screen name="mi-comercio/validar" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* SesionProvider envuelve toda la app: así cualquier pantalla puede leer
          la sesión con useSesion(). */}
      <SesionProvider>
        <Navegacion />
      </SesionProvider>
    </ThemeProvider>
  );
}
