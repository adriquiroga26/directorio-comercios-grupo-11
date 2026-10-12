import Ionicons from '@react-native-vector-icons/ionicons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// Los 4 tabs de abajo, tal como los pide el PRD: Buscar, Promos, Mapa, Yo.
// headerShown: false porque cada pantalla dibuja su propio encabezado
// (buscador, título, etc.), no el header nativo de la navegación.
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
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
