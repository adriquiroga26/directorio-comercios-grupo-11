import Ionicons from '@react-native-vector-icons/ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, responderResena } from '@/servicios';
import { LARGO_MAXIMO_RESPUESTA, validarRespuesta } from '@/utilidades/resenas';

// Formulario para responder una reseña. Se abre como modal desde la lista de reseñas del
// comercio. Muestra la reseña que se responde para tenerla a la vista mientras se escribe.
// Esta ruta sólo existe para cuentas de comercio (Stack.Protected en el layout raíz).
export default function ResponderResenaScreen() {
  // Los parámetros de la ruta SIEMPRE llegan como texto: por eso las estrellas se
  // convierten con Number().
  const { resenaId, estrellas, comentario } = useLocalSearchParams<{
    resenaId: string;
    estrellas: string;
    comentario: string;
  }>();
  const theme = useTheme();
  const router = useRouter();

  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function publicar() {
    const problema = validarRespuesta(respuesta);
    if (problema !== null) {
      setError(problema);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await responderResena(resenaId, respuesta.trim());
      // La lista se actualiza sola al volver (recarga cuando recibe el foco).
      router.back();
    } catch (e) {
      // El mensaje de ErrorApi viene de la API y está listo para mostrar (por ejemplo
      // "Ya respondiste esta reseña.").
      setError(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Responder reseña' }} />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <View style={[styles.cajaResena, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.filaEstrellas}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= Number(estrellas) ? 'star' : 'star-outline'}
                  size={16}
                  color="#D4A017"
                />
              ))}
            </View>
            <ThemedText>{comentario}</ThemedText>
          </View>

          <ThemedText type="smallBold">Tu respuesta</ThemedText>
          <TextInput
            value={respuesta}
            onChangeText={setRespuesta}
            placeholder="Escribí una respuesta amable"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Respuesta"
            multiline
            maxLength={LARGO_MAXIMO_RESPUESTA}
            textAlignVertical="top"
            style={[styles.campo, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.contador}>
            {respuesta.length}/{LARGO_MAXIMO_RESPUESTA}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            Se puede responder una sola vez: después de publicar, no se puede editar.
          </ThemedText>

          {error !== null && (
            <ThemedText type="small" style={styles.error} accessibilityRole="alert">
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={publicar}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityState={{ disabled: enviando }}
            style={[styles.botonPrincipal, { backgroundColor: theme.text, opacity: enviando ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {enviando ? 'Publicando…' : 'Publicar respuesta'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  contenido: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  cajaResena: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  filaEstrellas: {
    flexDirection: 'row',
    gap: 2,
  },
  campo: {
    minHeight: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
  },
  contador: {
    textAlign: 'right',
  },
  error: {
    color: '#C0392B',
  },
  botonPrincipal: {
    minHeight: 48,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
