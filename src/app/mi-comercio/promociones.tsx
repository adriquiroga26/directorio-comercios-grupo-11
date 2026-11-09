import Ionicons from '@react-native-vector-icons/ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaMiPromocion } from '@/components/TarjetaMiPromocion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { darDeBajaPromocion, ErrorApi, listarMisPromociones } from '@/servicios';
import type { Promocion } from '@/tipos';
import { estadoMiPromocion } from '@/utilidades/promociones';

type Estado = 'cargando' | 'error' | 'listo';

// La primera sección no lleva título (son las promos en uso); la segunda es "Dadas de baja".
interface Seccion {
  titulo: string | null;
  data: Promocion[];
}

// Las promociones del comercio: todas (vigentes, próximas, vencidas y dadas de baja), con
// cuántas veces se usó cada una. Desde acá se crea una nueva, se edita o se da de baja.
// Esta ruta sólo existe para cuentas de comercio (Stack.Protected en el layout raíz).
export default function MisPromocionesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [promociones, setPromociones] = useState<Promocion[]>([]);

  // Se recarga cada vez que la pantalla recibe el foco: así, al volver del formulario, la
  // lista ya muestra la promo nueva o editada.
  const cargar = useCallback(() => {
    let cancelado = false;
    setEstado('cargando');

    listarMisPromociones()
      .then((recibidas) => {
        if (cancelado) return;
        setPromociones(recibidas);
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

  // Dato derivado (no es estado): las dadas de baja van juntas al final, para que no se
  // mezclen con las que están en uso. Una sección vacía no se muestra.
  const secciones: Seccion[] = [
    { titulo: null, data: promociones.filter((p) => estadoMiPromocion(p) !== 'baja') },
    { titulo: 'Dadas de baja', data: promociones.filter((p) => estadoMiPromocion(p) === 'baja') },
  ].filter((seccion) => seccion.data.length > 0);

  function avisarError(error: unknown) {
    Alert.alert(
      'No se pudo completar',
      error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.',
    );
  }

  // Los parámetros de una ruta son texto: por eso el descuento y el "sólo app" se
  // pasan como texto y el formulario los vuelve a leer.
  function editar(promocion: Promocion) {
    router.push({
      pathname: '/mi-comercio/promocion',
      params: {
        id: promocion.id,
        titulo: promocion.titulo,
        detalle: promocion.detalle,
        descuento: promocion.descuento === null ? '' : String(promocion.descuento),
        desde: promocion.desde,
        hasta: promocion.hasta,
        soloApp: promocion.soloApp ? 'si' : 'no',
      },
    });
  }

  function darDeBaja(promocion: Promocion) {
    Alert.alert(
      'Dar de baja',
      `"${promocion.titulo}" dejará de verse para los vecinos. Se conserva con sus usos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dar de baja',
          style: 'destructive',
          onPress: () => {
            darDeBajaPromocion(promocion.id).then(cargar).catch(avisarError);
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Mis promociones' }} />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        <Pressable
          onPress={() => router.push('/mi-comercio/promocion')}
          accessibilityRole="button"
          style={[styles.botonNueva, { backgroundColor: theme.text }]}>
          <Ionicons name="add" size={20} color={theme.background} />
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Nueva promoción
          </ThemedText>
        </Pressable>

        {estado === 'cargando' && (
          <View style={styles.centrado}>
            <ThemedText themeColor="textSecondary">Cargando promociones…</ThemedText>
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

        {estado === 'listo' && promociones.length === 0 && (
          <View style={styles.centrado}>
            <ThemedText themeColor="textSecondary" style={styles.textoCentrado}>
              Todavía no cargaste promociones. Tocá «Nueva promoción» para crear la primera.
            </ThemedText>
          </View>
        )}

        {estado === 'listo' && promociones.length > 0 && (
          <SectionList
            sections={secciones}
            keyExtractor={(promocion) => promocion.id}
            contentContainerStyle={styles.listado}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
            renderSectionHeader={({ section }) =>
              section.titulo === null ? null : (
                <ThemedText type="smallBold" style={styles.tituloSeccion}>
                  {section.titulo}
                </ThemedText>
              )
            }
            renderItem={({ item }) => {
              // Sólo se editan o se dan de baja las que todavía sirven: una vencida no se
              // puede editar (la API lo rechaza) y una dada de baja ya está dada de baja.
              const estadoPromo = estadoMiPromocion(item);
              const modificable = estadoPromo === 'vigente' || estadoPromo === 'proxima';

              return (
                <TarjetaMiPromocion
                  promocion={item}
                  pie={
                    modificable ? (
                      <View style={styles.filaAcciones}>
                        <Pressable
                          onPress={() => editar(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Editar ${item.titulo}`}
                          hitSlop={8}
                          style={styles.accion}>
                          <ThemedText type="smallBold">Editar</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => darDeBaja(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Dar de baja ${item.titulo}`}
                          hitSlop={8}
                          style={styles.accion}>
                          <ThemedText type="smallBold">Dar de baja</ThemedText>
                        </Pressable>
                      </View>
                    ) : undefined
                  }
                />
              );
            }}
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
  botonNueva: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 48,
    margin: Spacing.three,
    borderRadius: Spacing.five,
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
    paddingBottom: Spacing.two,
  },
  filaAcciones: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  accion: {
    minHeight: 40,
    justifyContent: 'center',
  },
});
