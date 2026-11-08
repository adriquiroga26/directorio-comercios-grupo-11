import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormularioCuenta } from '@/components/FormularioCuenta';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSesion } from '@/sesion/SesionProvider';

// Pestaña "Yo". Tiene tres vistas según la sesión: cargando (se está leyendo si
// hay una guardada), sin sesión (formulario de ingreso o registro) y con sesión
// (los datos de la cuenta y el botón para cerrarla).
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
        <View style={styles.contenido}>
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

          <Pressable
            onPress={cerrarSesion}
            accessibilityRole="button"
            style={[styles.boton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Cerrar sesión</ThemedText>
          </Pressable>
        </View>
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
