import Ionicons from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ResenaConAutor } from '@/servicios';
import { fechaConAnio } from '@/utilidades/fechas';

interface Props {
  resena: ResenaConAutor;
}

export function TarjetaResena({ resena }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaEncabezado}>
        <ThemedText type="smallBold">{resena.nombreAutor}</ThemedText>
        <View style={styles.filaEstrellas}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= resena.estrellas ? 'star' : 'star-outline'}
              size={14}
              color="#D4A017"
            />
          ))}
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {fechaConAnio(resena.creadaEn)}
      </ThemedText>

      <ThemedText>{resena.comentario}</ThemedText>

      {resena.respuesta && (
        <View style={[styles.respuesta, { borderLeftColor: theme.backgroundSelected }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Respuesta del comercio: {resena.respuesta}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
  filaEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filaEstrellas: {
    flexDirection: 'row',
    gap: 2,
  },
  respuesta: {
    marginTop: Spacing.half,
    paddingLeft: Spacing.two,
    borderLeftWidth: 2,
  },
});
