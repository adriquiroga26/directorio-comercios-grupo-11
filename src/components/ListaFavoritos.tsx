import Ionicons from '@react-native-vector-icons/ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDirectorio } from '@/directorio/DirectorioProvider';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  ids: string[]; // los ids de los comercios favoritos (Usuario.favoritos)
}

// La cuenta sólo guarda los ids de los favoritos. Para mostrar sus nombres se pide el
// listado de comercios y se filtran los favoritos (un favorito dado de baja no aparece
// porque la API ya no lo incluye en el listado).
export function ListaFavoritos({ ids }: Props) {
  const theme = useTheme();

  // El directorio compartido (con respaldo en el teléfono): los favoritos se ven también sin
  // conexión, porque los ids se guardan con la sesión y los comercios con el directorio.
  const { estado, comercios, mensajeError, recargar, reintentar } = useDirectorio();

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  // Dato derivado (no es estado): se recalcula cuando cambia la lista de favoritos.
  const favoritos = comercios.filter((comercio) => ids.includes(comercio.id));

  return (
    <View style={styles.seccion}>
      <ThemedText type="smallBold">Mis favoritos</ThemedText>

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
          <Pressable onPress={reintentar} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="smallBold">Reintentar</ThemedText>
          </Pressable>
        </View>
      )}

      {estado === 'listo' && favoritos.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no marcaste ningún favorito. Tocá la estrella en la ficha de un comercio.
        </ThemedText>
      )}

      {estado === 'listo' &&
        favoritos.map((comercio) => (
          <Link key={comercio.id} href={`/comercios/${comercio.id}`} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver la ficha de ${comercio.nombre}`}
              // Link asChild no admite que su hijo reciba un ARREGLO de estilos: hay que
              // pasarle uno solo. StyleSheet.flatten junta el fijo y el del tema en un objeto.
              style={StyleSheet.flatten([styles.fila, { backgroundColor: theme.backgroundElement }])}>
              <Ionicons name="star" size={16} color={theme.text} />
              <ThemedText style={styles.nombre}>{comercio.nombre}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
          </Link>
        ))}
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
  nombre: {
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
