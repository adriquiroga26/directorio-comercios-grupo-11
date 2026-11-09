import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { borrarFotosGuardadas, resumenDeFotos, type ResumenDeFotos } from '@/almacen/fotos';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { textoTamano } from '@/utilidades/fotosLocales';

// Muestra cuánto ocupan en el teléfono las fotos de los comercios guardadas para verlas sin
// conexión, cuánto espacio libre queda, y deja borrarlas. Se bajan solas la próxima vez que el
// directorio se actualice con internet.
export function FotosGuardadas() {
  const theme = useTheme();
  const [resumen, setResumen] = useState<ResumenDeFotos | null>(null);

  // Se vuelve a leer cada vez que se entra a la pestaña (las fotos se bajan en segundo plano).
  const cargar = useCallback(() => {
    void resumenDeFotos()
      .then(setResumen)
      .catch(() => setResumen(null));
  }, []);
  useFocusEffect(cargar);

  function confirmarBorrado() {
    Alert.alert(
      'Borrar fotos guardadas',
      'Se borran las fotos de los comercios guardadas en el teléfono. Se vuelven a bajar solas la próxima vez que tengas internet.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            void borrarFotosGuardadas().then(cargar);
          },
        },
      ],
    );
  }

  // Si no se pudo leer el almacenamiento, esta sección no se muestra (es un extra).
  if (resumen === null) return null;

  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">Fotos guardadas en el teléfono</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {resumen.cantidad === 0
          ? 'Todavía no hay fotos guardadas.'
          : `${resumen.cantidad} ${resumen.cantidad === 1 ? 'foto' : 'fotos'} · ${textoTamano(resumen.bytes)}`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Espacio libre en el teléfono: {textoTamano(resumen.libres)}
      </ThemedText>
      {resumen.cantidad > 0 && (
        <Pressable
          onPress={confirmarBorrado}
          accessibilityRole="button"
          accessibilityLabel="Borrar las fotos guardadas en el teléfono"
          hitSlop={8}
          style={styles.accion}>
          <ThemedText type="smallBold">Borrar fotos guardadas</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  accion: {
    minHeight: 40,
    justifyContent: 'center',
  },
});
