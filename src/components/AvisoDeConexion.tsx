import Ionicons from '@react-native-vector-icons/ionicons';
import { useNetworkState } from 'expo-network';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDirectorio } from '@/directorio/DirectorioProvider';
import { textoGuardadoEl } from '@/utilidades/guardado';

// El cartel que avisa cuándo lo que se ve puede estar viejo (lo pide el PRD): no hay conexión,
// o no se pudo actualizar y se muestran los comercios guardados en el teléfono. Con todo al día
// no muestra nada.
export function AvisoDeConexion() {
  const theme = useTheme();
  const red = useNetworkState();
  const { desdeGuardado, actualizadoEn, reintentar } = useDirectorio();

  // `isInternetReachable` es undefined mientras el sistema no responde: en ese caso no se
  // asusta a nadie con un aviso de más.
  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  if (!sinConexion && !desdeGuardado) return null;

  let mensaje: string;
  if (desdeGuardado) {
    mensaje = `${
      sinConexion ? 'Sin conexión.' : 'No pudimos actualizar los comercios.'
    } Estás viendo los guardados ${textoGuardadoEl(actualizadoEn)}.`;
  } else {
    mensaje = 'Sin conexión. Las promociones y las reseñas necesitan internet.';
  }

  return (
    <View style={[styles.aviso, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="cloud-offline-outline" size={20} color={theme.text} />
      <View style={styles.texto}>
        <ThemedText type="small">{mensaje}</ThemedText>
        {!sinConexion && desdeGuardado && (
          <Pressable onPress={reintentar} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="smallBold">Reintentar</ThemedText>
          </Pressable>
        )}
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
    gap: Spacing.one,
  },
});
