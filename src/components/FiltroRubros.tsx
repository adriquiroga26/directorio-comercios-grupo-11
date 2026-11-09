import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Rubro } from '@/tipos';

interface Props {
  rubros: Rubro[];
  // El rubro elegido, o null para "Todos".
  seleccionado: string | null;
  onElegir: (rubroId: string | null) => void;
}

// Una fila de chips para filtrar por rubro: "Todos" y uno por cada rubro. La usan Buscar y Mapa.
export function FiltroRubros({ rubros, seleccionado, onElegir }: Props) {
  const theme = useTheme();
  const chips: { id: string | null; nombre: string }[] = [{ id: null, nombre: 'Todos' }, ...rubros];

  return (
    <FlatList
      data={chips}
      keyExtractor={(chip) => chip.id ?? 'todos'}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
      renderItem={({ item }) => {
        const activo = item.id === seleccionado;
        return (
          <Pressable
            onPress={() => onElegir(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por rubro ${item.nombre}`}
            hitSlop={8}
            style={[styles.chip, { backgroundColor: activo ? theme.text : theme.backgroundElement }]}>
            <ThemedText type="small" style={{ color: activo ? theme.background : theme.text }}>
              {item.nombre}
            </ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  fila: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    minHeight: 32,
    justifyContent: 'center',
  },
});
