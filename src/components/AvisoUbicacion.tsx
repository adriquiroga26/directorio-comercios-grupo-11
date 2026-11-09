import Ionicons from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUbicacion } from '@/ubicacion/UbicacionProvider';

// El cartel que explica el estado de la ubicación y deja activarla. Con la posición ya
// conseguida no muestra nada. En ningún caso bloquea la pantalla: buscar por nombre y por
// rubro sigue andando (es lo que pide el PRD si se niega el permiso).
export function AvisoUbicacion() {
  const theme = useTheme();
  const { estado, pedirUbicacion } = useUbicacion();

  if (estado === 'lista') return null;

  if (estado === 'buscando') {
    return (
      <View style={[styles.aviso, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="locate-outline" size={20} color={theme.text} />
        <ThemedText type="small" style={styles.texto}>
          Buscando tu ubicación…
        </ThemedText>
      </View>
    );
  }

  const mensaje =
    estado === 'bloqueada'
      ? 'La ubicación está desactivada para esta app. Podés activarla desde los Ajustes del teléfono, o seguir buscando por nombre y por rubro.'
      : estado === 'error'
        ? 'No pudimos saber dónde estás. Revisá que el GPS del teléfono esté activado.'
        : 'Activá tu ubicación para ver qué comercios tenés cerca. Si preferís no hacerlo, podés buscar igual por nombre y por rubro.';
  const boton =
    estado === 'bloqueada' ? 'Abrir Ajustes' : estado === 'error' ? 'Reintentar' : 'Usar mi ubicación';

  return (
    <View style={[styles.aviso, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="location-outline" size={20} color={theme.text} />
      <View style={styles.texto}>
        <ThemedText type="small">{mensaje}</ThemedText>
        <Pressable
          onPress={() => void pedirUbicacion()}
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.boton, { backgroundColor: theme.text }]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {boton}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  texto: {
    flex: 1,
    gap: Spacing.two,
  },
  boton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    justifyContent: 'center',
  },
});
