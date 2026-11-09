import Ionicons from '@react-native-vector-icons/ionicons';
import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useSesion } from '@/sesion/SesionProvider';

// Los 4 tabs de abajo, tal como los pide el PRD: Buscar, Promos, Mapa, Yo.
// headerShown: false porque cada pantalla dibuja su propio encabezado
// (buscador, título, etc.), no el header nativo de la navegación.
// El menú de navegación trae una altura FIJA de 49 puntos (más el borde de abajo del sistema).
// Con el tamaño de letra del teléfono en "grande", las etiquetas crecen y ya no entran: se
// cortan. Por eso la barra se agranda en la misma proporción que la letra.
const ALTO_BARRA = 49;

export default function TabsLayout() {
  const theme = useTheme();
  const { ingresoPedido } = useSesion();
  // fontScale: cuánto agranda la letra el teléfono (1 = normal, 1,3 = grande, 2 = el máximo).
  const { fontScale } = useWindowDimensions();
  // insets.bottom: lo que tapa la barra de navegación del sistema (los botones < O |||).
  const insets = useSafeAreaInsets();
  const altoBarra = Math.round(ALTO_BARRA * Math.max(1, fontScale)) + insets.bottom;

  return (
    <Tabs
      // Normalmente se abre en Buscar. Si el usuario eligió "Ingresar con email y
      // contraseña" en la pantalla de bloqueo, se abre directo en Yo (el formulario).
      initialRouteName={ingresoPedido ? 'yo' : 'index'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        // Con una altura propia (height), la barra la usa tal cual: hay que sumarle el borde del
        // sistema (insets.bottom), que ella misma agrega después como relleno.
        tabBarStyle: { backgroundColor: theme.background, height: altoBarra },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="promos"
        options={{
          title: 'Promos',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="yo"
        options={{
          title: 'Yo',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
