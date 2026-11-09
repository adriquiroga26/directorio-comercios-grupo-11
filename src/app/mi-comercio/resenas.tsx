import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaResena } from '@/components/TarjetaResena';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, listarResenasDeComercio, type ResenaConAutor } from '@/servicios';
import { useSesion } from '@/sesion/SesionProvider';

type Estado = 'cargando' | 'error' | 'listo';

interface Seccion {
  titulo: string;
  data: ResenaConAutor[];
}

// Las reseñas que recibió el comercio, con las que todavía no respondió arriba. Desde acá
// se abre el formulario para responder. Esta ruta sólo existe para cuentas de comercio
// (Stack.Protected en el layout raíz).
export default function MisResenasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { usuario } = useSesion();

  // El comercio de la cuenta viene en el usuario (comercioId es null en las cuentas de vecino).
  const comercioId = usuario?.comercioId ?? null;

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [resenas, setResenas] = useState<ResenaConAutor[]>([]);

  // Se recarga al recibir el foco: al volver del formulario, la reseña ya figura respondida.
  const cargar = useCallback(() => {
    if (comercioId === null) {
      setMensajeError('Tu cuenta no tiene un comercio asociado.');
      setEstado('error');
      return;
    }

    let cancelado = false;
    setEstado('cargando');

    listarResenasDeComercio(comercioId)
      .then((recibidas) => {
        if (cancelado) return;
        setResenas(recibidas);
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
  }, [comercioId]);

  useFocusEffect(cargar);

  // Dato derivado (no es estado): una sección vacía no se muestra.
  const secciones: Seccion[] = [
    { titulo: 'Sin responder', data: resenas.filter((r) => r.respuesta === null) },
    { titulo: 'Respondidas', data: resenas.filter((r) => r.respuesta !== null) },
  ].filter((seccion) => seccion.data.length > 0);

  function responder(resena: ResenaConAutor) {
    router.push({
      pathname: '/mi-comercio/responder',
      params: {
        resenaId: resena.id,
        estrellas: String(resena.estrellas),
        comentario: resena.comentario,
      },
    });
  }

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Reseñas' }} />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        {estado === 'cargando' && (
          <View style={styles.centrado}>
            <ThemedText themeColor="textSecondary">Cargando reseñas…</ThemedText>
          </View>
        )}

        {estado === 'error' && (
          <View style={styles.centrado}>
            <ThemedText themeColor="textSecondary" style={styles.textoCentrado}>
              {mensajeError}
            </ThemedText>
            <Pressable
              onPress={cargar}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.botonReintentar, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Reintentar</ThemedText>
            </Pressable>
          </View>
        )}

        {estado === 'listo' && resenas.length === 0 && (
          <View style={styles.centrado}>
            <ThemedText themeColor="textSecondary" style={styles.textoCentrado}>
              Todavía no recibiste reseñas.
            </ThemedText>
          </View>
        )}

        {estado === 'listo' && resenas.length > 0 && (
          <SectionList
            sections={secciones}
            keyExtractor={(resena) => resena.id}
            contentContainerStyle={styles.listado}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => (
              <View style={[styles.separador, { backgroundColor: theme.backgroundElement }]} />
            )}
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" style={styles.tituloSeccion}>
                {section.titulo} · {section.data.length}
              </ThemedText>
            )}
            renderItem={({ item }) => (
              <TarjetaResena
                resena={item}
                pie={
                  item.respuesta === null ? (
                    <Pressable
                      onPress={() => responder(item)}
                      accessibilityRole="button"
                      accessibilityLabel="Responder esta reseña"
                      hitSlop={8}
                      style={styles.accion}>
                      <ThemedText type="smallBold">Responder</ThemedText>
                    </Pressable>
                  ) : undefined
                }
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  textoCentrado: {
    textAlign: 'center',
  },
  botonReintentar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    minHeight: 48,
    justifyContent: 'center',
  },
  listado: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  tituloSeccion: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  separador: {
    height: 1,
  },
  accion: {
    minHeight: 40,
    justifyContent: 'center',
  },
});
