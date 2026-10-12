import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface Props {
  titulo: string;
  descripcion: string;
}

// Pantalla provisoria para un tab que todavía no se construyó.
// Se reemplaza por la pantalla real cuando le toque el turno en el plan de trabajo.
export function PantallaPendiente({ titulo, descripcion }: Props) {
  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">{titulo}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.descripcion}>
          {descripcion}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  descripcion: {
    textAlign: 'center',
  },
});
