import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormularioCuenta } from '@/components/FormularioCuenta';
import { ListaFavoritos } from '@/components/ListaFavoritos';
import { PanelComercio } from '@/components/PanelComercio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSesion } from '@/sesion/SesionProvider';

// Pestaña "Yo". Tiene tres vistas según la sesión: cargando (se está leyendo si
// hay una guardada), sin sesión (formulario de ingreso o registro) y con sesión
// (los datos de la cuenta, los favoritos si es vecino, y el botón para cerrarla).
export default function YoScreen() {
  const theme = useTheme();
  const { estado, usuario, cerrarSesion } = useSesion();

  if (estado === 'cargando') {
    return (
      <ThemedView style={styles.centrado}>
        <ThemedText themeColor="textSecondary">Cargando…</ThemedText>
      </ThemedView>
    );
  }

  if (estado === 'sin-sesion' || usuario === null) {
    return <FormularioCuenta />;
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
        {/* ScrollView porque la lista de favoritos puede crecer más que la pantalla. */}
        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Hola, {usuario.nombre}</ThemedText>

          <View style={[styles.tarjeta, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Email
            </ThemedText>
            <ThemedText>{usuario.email}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tipo de cuenta
            </ThemedText>
            <ThemedText>{usuario.rol === 'comercio' ? 'Comercio' : 'Vecino'}</ThemedText>
          </View>

          {/* Cada tipo de cuenta ve lo suyo: el vecino sus favoritos y el comercio su panel. */}
          {usuario.rol === 'vecino' && <ListaFavoritos ids={usuario.favoritos} />}
          {usuario.rol === 'comercio' && <PanelComercio />}

          <Pressable
            onPress={cerrarSesion}
            accessibilityRole="button"
            style={[styles.boton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Cerrar sesión</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  tarjeta: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  boton: {
    minHeight: 48,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
