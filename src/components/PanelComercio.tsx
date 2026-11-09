import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, obtenerMiComercio } from '@/servicios';
import { pedirDesbloqueo } from '@/sesion/biometria';
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

  // El PRD: "el comercio reingresa con huella antes de escanear". Validar códigos es una acción
  // delicada, así que antes de abrir la cámara se vuelve a pedir la huella o el rostro.
  function abrirValidacion() {
    pedirDesbloqueo().then((resultado) => {
      if (resultado === 'rechazada') {
        Alert.alert(
          'No pudimos confirmar tu identidad',
          'Para validar códigos tenés que identificarte con tu huella o tu rostro.',
        );
        return;
      }
      // 'ok': se identificó. 'sin-biometria': el teléfono no tiene huella ni rostro registrados,
      // no hay con qué pedirla y se entra igual (la sesión ya estaba abierta).
      router.push('/mi-comercio/validar');
    });
  }

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
        onPress={() => router.push('/mi-comercio/ficha')}
        accessibilityRole="button"
        accessibilityLabel="Editar los datos de mi comercio"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="create-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Datos del comercio</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/mi-comercio/multimedia')}
        accessibilityRole="button"
        accessibilityLabel="Editar las fotos y el video de mi comercio"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="images-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Fotos y video</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/mi-comercio/horarios')}
        accessibilityRole="button"
        accessibilityLabel="Editar los horarios y las vacaciones de mi comercio"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="time-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Horarios y vacaciones</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/mi-comercio/promociones')}
        accessibilityRole="button"
        accessibilityLabel="Ver y administrar mis promociones"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="pricetag-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Mis promociones</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/mi-comercio/resenas')}
        accessibilityRole="button"
        accessibilityLabel="Ver y responder las reseñas de mi comercio"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Reseñas</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={abrirValidacion}
        accessibilityRole="button"
        accessibilityLabel="Validar el código de un cliente"
        style={[styles.fila, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="qr-code-outline" size={18} color={theme.text} />
        <ThemedText style={styles.textoFila}>Validar código</ThemedText>
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
