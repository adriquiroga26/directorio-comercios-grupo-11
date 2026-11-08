import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SesionProvider } from '@/sesion/SesionProvider';

// Layout raíz: define el tema, la sesión y esconde el splash nativo apenas la app
// terminó de montar. La navegación real (los 4 tabs del PRD) vive en
// src/app/(tabs)/_layout.tsx.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* SesionProvider envuelve toda la app: así cualquier pantalla puede leer
          la sesión con useSesion(). */}
      <SesionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SesionProvider>
    </ThemeProvider>
  );
}
