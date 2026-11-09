import Ionicons from '@react-native-vector-icons/ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Promocion } from '@/tipos';
import { fechaConAnio } from '@/utilidades/fechas';
import { type EstadoMiPromocion, estadoMiPromocion } from '@/utilidades/promociones';

interface Props {
  promocion: Promocion;
  // Los botones de la tarjeta (editar, dar de baja). Los arma la pantalla.
  pie?: ReactNode;
}

// Record<EstadoMiPromocion, string> obliga a tener un texto por cada estado.
const ETIQUETA_ESTADO: Record<EstadoMiPromocion, string> = {
  vigente: 'Vigente',
  proxima: 'Próxima',
  vencida: 'Vencida',
  baja: 'Dada de baja',
};

// Una promo vista por su dueño: a diferencia de TarjetaPromocion (la del público), muestra
// el estado (también vencida y de baja), la vigencia completa y cuántas veces se usó.
export function TarjetaMiPromocion({ promocion, pie }: Props) {
  const theme = useTheme();
  const estado = estadoMiPromocion(promocion);

  return (
    <ThemedView type="backgroundElement" style={styles.tarjeta}>
      <View style={styles.filaTitulo}>
        <ThemedText type="smallBold" style={styles.titulo} numberOfLines={2}>
          {promocion.titulo}
        </ThemedText>
        {promocion.descuento !== null && (
          <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">{promocion.descuento}% OFF</ThemedText>
          </View>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Del {fechaConAnio(promocion.desde)} al {fechaConAnio(promocion.hasta)}
      </ThemedText>

      <View style={styles.filaEtiquetas}>
        <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{ETIQUETA_ESTADO[estado]}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {promocion.usos === 1 ? '1 uso' : `${promocion.usos} usos`}
        </ThemedText>
        {promocion.soloApp && (
          <View style={styles.filaSoloApp}>
            <Ionicons name="qr-code-outline" size={12} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              Exclusiva app
            </ThemedText>
          </View>
        )}
      </View>

      {pie}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: Spacing.one,
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
});
