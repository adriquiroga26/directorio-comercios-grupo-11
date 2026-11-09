import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, obtenerMiComercio } from '@/servicios';
import type { Comercio } from '@/tipos';

type Estado = 'cargando' | 'error' | 'listo';

// Lo que ve una cuenta de COMERCIO en la pestaña Yo: el nombre de su comercio y el menú
// con sus herramientas (por ahora, sus promociones). Los vecinos no ven esto.
export function PanelComercio() {
  const theme = useTheme();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercio, setComercio] = useState<Comercio | null>(null);

  const cargar = useCallback(() => {
    let cancelado = false;
    setEstado('cargando');

    obtenerMiComercio()
      .then((recibido) => {
        if (cancelado) return;
        setComercio(recibido);
        setEstado('listo');
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        setMensajeError(error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.');
        setEstado('error');
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useFocusEffect(cargar);

  return (
    <View style={styles.seccion}>
      <ThemedText type="smallBold">Mi comercio</ThemedText>

      {estado === 'cargando' && (
        <ThemedText type="small" themeColor="textSecondary">
          Cargando…
        </ThemedText>
      )}

      {estado === 'error' && (
        <View style={styles.filaError}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.textoError}>
            {mensajeError}
          </ThemedText>
          <Pressable onPress={cargar} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="smallBold">Reintentar</ThemedText>
          </Pressable>
        </View>
      )}

      {estado === 'listo' && comercio !== null && (
        <ThemedText>{comercio.nombre}</ThemedText>
      )}

      <Pressable
        onPress={() => router.push('/mi-comercio/promociones')}
        accessibilityRole="button"
        accessibilityLabel="Ver y administrar mis promociones"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="pricetag-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Mis promociones</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: {
    gap: Spacing.two,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  textoFila: {
    flex: 1,
  },
  filaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textoError: {
    flex: 1,
  },
});
