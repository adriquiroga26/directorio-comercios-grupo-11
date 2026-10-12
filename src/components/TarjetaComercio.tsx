import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Comercio, Rubro } from '@/tipos';
import { calcularApertura, textoApertura } from '@/utilidades/horarios';

interface Props {
  comercio: Comercio;
  rubro: Rubro | null;
}

// Rubro.icono es un string (así viaja en el PRD y va a viajar en la API).
// Ionicons quiere un nombre exacto de su catálogo: convertimos acá, en el
// borde de la UI, en vez de atar el tipo del dato a una librería de íconos.
type NombreIcono = ComponentProps<typeof Ionicons>['name'];

const LADO_IMAGEN = 72;

// Color del texto de apertura: verde si está abierto, gris para el resto de
// los estados (cerrado, de vacaciones, inactivo). No hace falta distinguir
// más que eso en la lista; la ficha del comercio sí lo explica en detalle.
function colorEstado(abierto: boolean, colorAtenuado: string): string {
  return abierto ? '#2E9E5B' : colorAtenuado;
}

export function TarjetaComercio({ comercio, rubro }: Props) {
  const theme = useTheme();
  const apertura = calcularApertura(comercio);
  const primeraImagen = comercio.imagenes[0] ?? null;

  return (
    <ThemedView type="backgroundElement" style={styles.tarjeta}>
      {primeraImagen ? (
        <Image source={{ uri: primeraImagen }} style={styles.imagen} contentFit="cover" />
      ) : (
        <View style={[styles.imagen, styles.imagenVacia, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
        </View>
      )}

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {comercio.nombre}
        </ThemedText>

        <View style={styles.filaRubro}>
          {rubro && <Ionicons name={rubro.icono as NombreIcono} size={14} color={rubro.color} />}
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {rubro?.nombre ?? 'Sin rubro'}
          </ThemedText>
        </View>

        <ThemedText
          type="small"
          style={{ color: colorEstado(apertura.abierto, theme.textSecondary) }}>
          {textoApertura(apertura)}
        </ThemedText>

        <View style={styles.filaPuntaje}>
          {comercio.cantidadResenas > 0 ? (
            <>
              <Ionicons name="star" size={14} color="#D4A017" />
              <ThemedText type="small" themeColor="textSecondary">
                {comercio.puntaje.toFixed(1)} ({comercio.cantidadResenas})
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía sin reseñas
            </ThemedText>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  imagen: {
    width: LADO_IMAGEN,
    height: LADO_IMAGEN,
    borderRadius: Spacing.two,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.half,
    justifyContent: 'center',
  },
  filaRubro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  filaPuntaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
