import Ionicons from '@react-native-vector-icons/ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { crearResena, editarResena, ErrorApi } from '@/servicios';
import type { Resena } from '@/tipos';
import { LARGO_MAXIMO_COMENTARIO, validarResena } from '@/utilidades/resenas';

// Pantalla para escribir una reseña o editar la propia. Se abre como modal desde la
// ficha del comercio. Si llega `resenaId`, es una edición y los campos arrancan con lo
// que ya había; si no, es una reseña nueva.
export default function ResenaScreen() {
  // Los parámetros de la ruta SIEMPRE llegan como texto: por eso las estrellas se
  // convierten con Number().
  const { comercioId, resenaId, estrellas: estrellasParam, comentario: comentarioParam } =
    useLocalSearchParams<{
      comercioId: string;
      resenaId?: string;
      estrellas?: string;
      comentario?: string;
    }>();
  const theme = useTheme();
  const router = useRouter();

  const esEdicion = resenaId !== undefined;

  const [estrellas, setEstrellas] = useState(esEdicion ? Number(estrellasParam) : 0);
  const [comentario, setComentario] = useState(comentarioParam ?? '');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    // Primero se valida acá, para avisar al instante sin hacer un pedido que va a fallar.
    const problema = validarResena({ estrellas, comentario });
    if (problema !== null) {
      setError(problema);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      // validarResena ya comprobó que son un entero de 1 a 5: se le dice a TypeScript.
      const datos = { estrellas: estrellas as Resena['estrellas'], comentario: comentario.trim() };
      if (esEdicion) {
        await editarResena(resenaId, datos);
      } else {
        await crearResena(comercioId, datos);
      }
      // La ficha se actualiza sola al volver (recarga los datos cuando recibe el foco).
      router.back();
    } catch (e) {
      // El mensaje de ErrorApi viene de la API y está listo para mostrar (por ejemplo
      // "Ya dejaste una reseña para este comercio. Podés editarla.").
      setError(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen
        options={{ headerShown: true, title: esEdicion ? 'Editar reseña' : 'Dejar reseña' }}
      />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <ThemedText type="smallBold">Tu puntuación</ThemedText>
          <View style={styles.filaEstrellas}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setEstrellas(n)}
                accessibilityRole="button"
                accessibilityLabel={n === 1 ? '1 estrella' : `${n} estrellas`}
                accessibilityState={{ selected: n <= estrellas }}
                hitSlop={4}
                style={styles.botonEstrella}>
                <Ionicons
                  name={n <= estrellas ? 'star' : 'star-outline'}
                  size={36}
                  color="#D4A017"
                />
              </Pressable>
            ))}
          </View>

          <ThemedText type="smallBold">Tu comentario</ThemedText>
          <TextInput
            value={comentario}
            onChangeText={setComentario}
            placeholder="Contá cómo fue tu experiencia"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Comentario"
            multiline
            maxLength={LARGO_MAXIMO_COMENTARIO}
            textAlignVertical="top"
            style={[styles.campo, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.contador}>
            {comentario.length}/{LARGO_MAXIMO_COMENTARIO}
          </ThemedText>

          {error !== null && (
            <ThemedText type="small" style={styles.error} accessibilityRole="alert">
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={guardar}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityState={{ disabled: enviando }}
            style={[styles.botonPrincipal, { backgroundColor: theme.text, opacity: enviando ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Publicar reseña'}
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
  filaEstrellas: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  botonEstrella: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
