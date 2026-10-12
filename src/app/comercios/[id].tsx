import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { TarjetaResena } from '@/components/TarjetaResena';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ErrorApi,
  listarResenasDeComercio,
  listarRubros,
  obtenerComercio,
  type ResenaConAutor,
} from '@/servicios';
import type { Comercio, Rubro } from '@/tipos';
import { calcularApertura, resumenSemanal, textoApertura } from '@/utilidades/horarios';

type Estado = 'cargando' | 'error' | 'listo';

// Igual que en TarjetaComercio: el rubro trae el ícono como string (así
// viaja en el PRD/API), Ionicons quiere un nombre exacto de su catálogo.
type NombreIcono = ComponentProps<typeof Ionicons>['name'];

const ALTO_MEDIA = 220;

export default function FichaComercioScreen() {
  // useLocalSearchParams siempre entrega strings (o arrays de strings).
  // Acá "id" ya es el formato que necesitamos (Comercio.id también es
  // string), así que no hace falta convertir nada; si fuera un número
  // habría que hacer Number(id) antes de usarlo.
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercio, setComercio] = useState<Comercio | null>(null);
  const [rubro, setRubro] = useState<Rubro | null>(null);
  const [resenas, setResenas] = useState<ResenaConAutor[]>([]);
  const [videoConError, setVideoConError] = useState(false);

  const cargar = useCallback(() => {
    let cancelado = false;
    setEstado('cargando');
    setVideoConError(false);

    Promise.all([obtenerComercio(id), listarRubros(), listarResenasDeComercio(id)])
      .then(([comercioRecibido, rubros, resenasRecibidas]) => {
        if (cancelado) return;
        setComercio(comercioRecibido);
        setRubro(rubros.find((r) => r.id === comercioRecibido.rubroId) ?? null);
        setResenas(resenasRecibidas);
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
  }, [id]);

  useFocusEffect(cargar);

  // El player se crea siempre (con source null si todavía no hay comercio o
  // no tiene video): los hooks no se pueden llamar "a veces". Lo que sí es
  // condicional es mostrar o no el <VideoView/> más abajo.
  const player = useVideoPlayer(comercio?.videoUrl ?? null, (reproductor) => {
    reproductor.loop = false;
  });

  useEffect(() => {
    const suscripcion = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') setVideoConError(true);
    });
    return () => suscripcion.remove();
  }, [player]);

  function abrirEnMapa() {
    if (!comercio) return;
    // Usa las coordenadas fijas del comercio, no la ubicación del usuario
    // (eso necesita expo-location, Unidad 4, todavía no vista). Sólo abre
    // la app de mapas del teléfono con Linking, como pide el PRD.
    const { latitud, longitud } = comercio.coordenadas;
    const etiqueta = encodeURIComponent(comercio.nombre);
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${etiqueta}&ll=${latitud},${longitud}`
        : `geo:${latitud},${longitud}?q=${latitud},${longitud}(${etiqueta})`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`);
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: comercio?.nombre ?? 'Comercio' }} />

      {estado === 'cargando' && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Cargando…</ThemedText>
        </ThemedView>
      )}

      {estado === 'error' && (
        <ThemedView style={styles.centrado}>
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
        </ThemedView>
      )}

      {estado === 'listo' && comercio && (
        <SafeAreaView style={styles.contenedor} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.cuerpo}>
                {comercio.videoUrl && !videoConError ? (
                  <VideoView player={player} style={styles.media} nativeControls />
                ) : comercio.imagenes[0] ? (
                  <Image source={{ uri: comercio.imagenes[0] }} style={styles.media} contentFit="cover" />
                ) : (
                  <View style={[styles.media, styles.mediaVacia, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="image-outline" size={36} color={theme.textSecondary} />
                  </View>
                )}

                <View style={styles.seccion}>
                  <ThemedText type="subtitle">{comercio.nombre}</ThemedText>

                  <View style={styles.filaRubro}>
                    {rubro && <Ionicons name={rubro.icono as NombreIcono} size={16} color={rubro.color} />}
                    <ThemedText themeColor="textSecondary">{rubro?.nombre ?? 'Sin rubro'}</ThemedText>
                  </View>

                  <ThemedText themeColor="textSecondary">{comercio.direccion}</ThemedText>

                  <ThemedText
                    type="smallBold"
                    style={{
                      color: calcularApertura(comercio).abierto ? '#2E9E5B' : theme.textSecondary,
                    }}>
                    {textoApertura(calcularApertura(comercio))}
                  </ThemedText>

                  <ThemedText themeColor="textSecondary">
                    {comercio.cantidadResenas > 0
                      ? `★ ${comercio.puntaje.toFixed(1)} (${comercio.cantidadResenas} reseñas)`
                      : 'Todavía sin reseñas'}
                  </ThemedText>
                </View>

                <View style={styles.filaBotones}>
                  {comercio.telefono && (
                    <BotonAccion
                      icono="call-outline"
                      etiqueta="Llamar"
                      onPress={() => Linking.openURL(`tel:${comercio.telefono}`)}
                    />
                  )}
                  {comercio.whatsapp && (
                    <BotonAccion
                      icono="logo-whatsapp"
                      etiqueta="WhatsApp"
                      onPress={() => Linking.openURL(`https://wa.me/${comercio.whatsapp}`)}
                    />
                  )}
                  <BotonAccion icono="navigate-outline" etiqueta="Ir" onPress={abrirEnMapa} />
                  {comercio.instagram && (
                    <BotonAccion
                      icono="logo-instagram"
                      etiqueta="Instagram"
                      onPress={() =>
                        Linking.openURL(`https://instagram.com/${comercio.instagram!.replace('@', '')}`)
                      }
                    />
                  )}
                </View>

                <View style={styles.seccion}>
                  <ThemedText type="smallBold">Horarios</ThemedText>
                  <FlatList
                    data={resumenSemanal(comercio.horarios)}
                    keyExtractor={(fila) => String(fila.dia)}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={styles.filaHorario}>
                        <ThemedText style={styles.nombreDia}>
                          {item.nombre[0].toUpperCase() + item.nombre.slice(1)}
                        </ThemedText>
                        <ThemedText themeColor={item.texto === 'Cerrado' ? 'textSecondary' : 'text'}>
                          {item.texto}
                        </ThemedText>
                      </View>
                    )}
                  />
                </View>

                {comercio.mediosDePago.length > 0 && (
                  <View style={styles.seccion}>
                    <ThemedText type="smallBold">Medios de pago</ThemedText>
                    <FlatList
                      data={comercio.mediosDePago}
                      keyExtractor={(medio) => medio}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filaChips}
                      renderItem={({ item }) => (
                        <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                          <ThemedText type="small">{item}</ThemedText>
                        </View>
                      )}
                    />
                  </View>
                )}

                <View style={styles.seccion}>
                  <ThemedText type="smallBold">
                    Reseñas{comercio.cantidadResenas > 0 ? ` · ${comercio.puntaje.toFixed(1)} ★` : ''}
                  </ThemedText>
                  {resenas.length === 0 ? (
                    <ThemedText themeColor="textSecondary">Todavía no hay reseñas.</ThemedText>
                  ) : (
                    <FlatList
                      data={resenas}
                      keyExtractor={(resena) => resena.id}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => (
                        <View style={[styles.separadorResena, { backgroundColor: theme.backgroundElement }]} />
                      )}
                      renderItem={({ item }) => <TarjetaResena resena={item} />}
                    />
                  )}
                  {/* Dejar tu propia reseña, editarla/borrarla y reportar necesitan
                      cuenta de usuario (login con token + biometría es Unidad 6,
                      todavía no vista): pendiente hasta esa unidad. */}
                </View>
              </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </>
  );
}

interface PropsBotonAccion {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
}

function BotonAccion({ icono, etiqueta, onPress }: PropsBotonAccion) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      style={[styles.botonAccion, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name={icono} size={20} color={theme.text} />
      <ThemedText type="small">{etiqueta}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing.four,
  },
  cuerpo: {
    gap: Spacing.four,
  },
  media: {
    width: '100%',
    height: ALTO_MEDIA,
  },
  mediaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccion: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  filaRubro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  filaBotones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  botonAccion: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    minHeight: 48,
    minWidth: 76,
  },
  filaHorario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.half,
  },
  nombreDia: {
    width: 90,
  },
  filaChips: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  separadorResena: {
    height: 1,
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
});
