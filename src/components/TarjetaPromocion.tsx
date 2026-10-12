import Ionicons from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Comercio, Promocion } from '@/tipos';
import { fechaCorta } from '@/utilidades/fechas';
import { estaPorVencer, estadoPromocion } from '@/utilidades/promociones';

interface Props {
  promocion: Promocion;
  comercio: Comercio | null;
}

export function TarjetaPromocion({ promocion, comercio }: Props) {
  const theme = useTheme();
  const estado = estadoPromocion(promocion);
  const porVencer = estaPorVencer(promocion);

  return (
    <ThemedView type="backgroundElement" style={styles.tarjeta}>
      <View style={styles.filaTitulo}>
        <ThemedText type="smallBold" style={styles.titulo} numberOfLines={1}>
          {promocion.titulo}
        </ThemedText>
        {promocion.descuento !== null && (
          <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">{promocion.descuento}% OFF</ThemedText>
          </View>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {comercio?.nombre ?? 'Comercio'}
      </ThemedText>

      <View style={styles.filaEtiquetas}>
        <ThemedText type="small" themeColor="textSecondary">
          {estado === 'proxima'
            ? `Empieza el ${fechaCorta(promocion.desde)}`
            : `Hasta el ${fechaCorta(promocion.hasta)}`}
        </ThemedText>

        {porVencer && (
          <View style={[styles.chip, styles.chipAviso]}>
            <ThemedText type="small" style={styles.textoAviso}>
              Vence pronto
            </ThemedText>
          </View>
        )}

        {promocion.soloApp && (
          <View style={styles.filaSoloApp}>
            <Ionicons name="qr-code-outline" size={12} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              Exclusiva app
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titulo: {
    flex: 1,
  },
  filaEtiquetas: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filaSoloApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  chipAviso: {
    backgroundColor: '#5C2E1A',
  },
  textoAviso: {
    color: '#F2A65A',
  },
});
