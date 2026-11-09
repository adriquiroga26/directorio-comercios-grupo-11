import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { TarjetaResena } from '@/components/TarjetaResena';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  agregarFavorito,
  borrarResena,
  ErrorApi,
  listarResenasDeComercio,
  listarRubros,
  obtenerComercio,
  quitarFavorito,
  reportarResena,
  type ResenaConAutor,
} from '@/servicios';
import { useSesion } from '@/sesion/SesionProvider';
import { useRequiereCuenta } from '@/sesion/useRequiereCuenta';
import type { Comercio, Rubro } from '@/tipos';
// La API manda ids como "billetera_virtual"; en pantalla va el texto legible (la tabla
// de etiquetas se comparte con el formulario de edición de la ficha).
import { ETIQUETA_MEDIO_DE_PAGO } from '@/utilidades/ficha';
import { calcularApertura, resumenSemanal, textoApertura } from '@/utilidades/horarios';
import { nombrePublico } from '@/utilidades/usuarios';

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
  const router = useRouter();
  const { usuario, actualizarUsuario } = useSesion();
  const requerirCuenta = useRequiereCuenta();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercio, setComercio] = useState<Comercio | null>(null);
  const [rubro, setRubro] = useState<Rubro | null>(null);
  const [resenas, setResenas] = useState<ResenaConAutor[]>([]);
  const [videoConError, setVideoConError] = useState(false);
  const [guardandoFavorito, setGuardandoFavorito] = useState(false);
  const [reportadas, setReportadas] = useState<string[]>([]); // ids de reseñas que ya reportaste

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

  // Dato derivado (no es estado): arriba se ve el video si hay y anda; si no, la primera foto.
  // Las fotos que no quedaron arriba van en la tira de abajo.
  const seVeElVideo = comercio !== null && comercio.videoUrl !== null && !videoConError;
  const fotosDeLaTira =
    comercio === null ? [] : seVeElVideo ? comercio.imagenes : comercio.imagenes.slice(1);

  // Se calculan en cada render a partir de la sesión: no son estado.
  const esFavorito = comercio !== null && (usuario?.favoritos.includes(comercio.id) ?? false);
  // Las cuentas de comercio no tienen favoritos (la API respondería SIN_PERMISO):
  // a ellas no se les muestra la estrella.
  const puedeTenerFavoritos = comercio !== null && usuario?.rol !== 'comercio';

  function alternarFavorito() {
    if (comercio === null) return;
    const comercioId = comercio.id;

    // Sin sesión, requerirCuenta muestra el cartel "Necesitás una cuenta".
    requerirCuenta(() => {
      if (usuario === null || guardandoFavorito) return;
      setGuardandoFavorito(true);

      // Agregar: la API devuelve el usuario actualizado. Quitar: responde 204
      // (sin cuerpo), así que la lista se arma a mano sacando ese id.
      const operacion = esFavorito
        ? quitarFavorito(comercioId).then(() =>
            actualizarUsuario({
              ...usuario,
              favoritos: usuario.favoritos.filter((favorito) => favorito !== comercioId),
            }),
          )
        : agregarFavorito(comercioId).then((usuarioActualizado) => {
            actualizarUsuario(usuarioActualizado);
            // El PRD: vibración "al guardar un favorito". Una vibración corta de éxito.
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          });

      operacion
        .catch((error: unknown) => {
          Alert.alert(
            'No se pudo guardar',
            error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.',
          );
        })
        .finally(() => setGuardandoFavorito(false));
    });
  }

  // Tu reseña de este comercio, si ya dejaste una (la API admite una por vecino y comercio).
  const miResena =
    usuario === null ? null : (resenas.find((resena) => resena.usuarioId === usuario.id) ?? null);

  function avisarError(error: unknown) {
    Alert.alert(
      'No se pudo completar',
      error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.',
    );
  }

  // La reseña se escribe en otra pantalla (modal). Al volver, esta ficha se recarga sola.
  function dejarResena() {
    if (comercio === null) return;
    const comercioId = comercio.id;
    requerirCuenta(() => router.push({ pathname: '/resena/[comercioId]', params: { comercioId } }));
  }

  // Los parámetros de una ruta son texto: por eso las estrellas se pasan con String().
  function editarMiResena(resena: ResenaConAutor) {
    router.push({
      pathname: '/resena/[comercioId]',
      params: {
        comercioId: resena.comercioId,
        resenaId: resena.id,
        estrellas: String(resena.estrellas),
        comentario: resena.comentario,
      },
    });
  }

  function borrarMiResena(resena: ResenaConAutor) {
    Alert.alert('Borrar reseña', '¿Seguro que querés borrar tu reseña? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        // Después de borrar se vuelve a cargar la ficha: cambian el puntaje y la cantidad.
        onPress: () => {
          borrarResena(resena.id).then(cargar).catch(avisarError);
        },
      },
    ]);
  }

  function reportar(resena: ResenaConAutor) {
    requerirCuenta(() => {
      Alert.alert('Reportar reseña', '¿Querés reportar esta reseña como ofensiva?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reportar',
          onPress: () => {
            // La reseña sigue visible (el PRD sólo pide el botón de reportar); acá se
            // anota que ya la reportaste para no ofrecer el botón de nuevo.
            reportarResena(resena.id)
              .then(() => setReportadas((anteriores) => [...anteriores, resena.id]))
              .catch(avisarError);
          },
        },
      ]);
    });
  }

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
      <Stack.Screen
        options={{
          headerShown: true,
          title: comercio?.nombre ?? 'Comercio',
          // La estrella de favorito (como en el mockup del PRD). `tintColor` es el
          // color del encabezado: así el ícono lo toma sin repetir el valor.
          headerRight: puedeTenerFavoritos
            ? ({ tintColor }) => (
                <Pressable
                  onPress={alternarFavorito}
                  disabled={guardandoFavorito}
                  accessibilityRole="button"
                  accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  accessibilityState={{ selected: esFavorito, disabled: guardandoFavorito }}
                  hitSlop={12}>
                  <Ionicons name={esFavorito ? 'star' : 'star-outline'} size={24} color={tintColor} />
                </Pressable>
              )
            : undefined,
        }}
      />

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

                {/* El recuadro de arriba muestra una sola cosa: el video, o si no hay, la primera
                    foto. El resto de las fotos (todas, si arriba se ve el video) van en esta
                    tira que se desliza hacia el costado. */}
                {fotosDeLaTira.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tiraFotos}>
                    {fotosDeLaTira.map((url) => (
                      <Image
                        key={url}
                        source={{ uri: url }}
                        style={[styles.fotoTira, { backgroundColor: theme.backgroundElement }]}
                        contentFit="cover"
                        accessibilityLabel={`Foto de ${comercio.nombre}`}
                      />
                    ))}
                  </ScrollView>
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
                          <ThemedText type="small">{ETIQUETA_MEDIO_DE_PAGO[item]}</ThemedText>
                        </View>
                      )}
                    />
                  </View>
                )}

                <View style={styles.seccion}>
                  <ThemedText type="smallBold">
                    Reseñas{comercio.cantidadResenas > 0 ? ` · ${comercio.puntaje.toFixed(1)} ★` : ''}
                  </ThemedText>

                  {/* Una reseña por vecino y comercio: si ya dejaste una, se edita desde la
                      propia reseña. Las cuentas de comercio no reseñan. */}
                  {usuario?.rol !== 'comercio' && miResena === null && (
                    <Pressable
                      onPress={dejarResena}
                      accessibilityRole="button"
                      style={[styles.botonResena, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="create-outline" size={18} color={theme.text} />
                      <ThemedText type="smallBold">Dejar reseña</ThemedText>
                    </Pressable>
                  )}

                  {resenas.length === 0 ? (
                    <ThemedText themeColor="textSecondary">Todavía no hay reseñas.</ThemedText>
                  ) : (
                    <FlatList
                      data={resenas}
                      keyExtractor={(resena) => resena.id}
                      scrollEnabled={false}
                      // La lista es PureComponent: sin extraData no se redibuja cuando
                      // cambia la sesión o las reseñas reportadas (no están en `data`).
                      extraData={{ reportadas, usuario }}
                      ItemSeparatorComponent={() => (
                        <View style={[styles.separadorResena, { backgroundColor: theme.backgroundElement }]} />
                      )}
                      renderItem={({ item }) => {
                        const esMia = usuario !== null && item.usuarioId === usuario.id;
                        // La API no entrega nombres de otros usuarios; el propio sí lo sabemos.
                        const resena = esMia
                          ? { ...item, nombreAutor: `${nombrePublico(usuario.nombre)} (vos)` }
                          : item;

                        return (
                          <TarjetaResena
                            resena={resena}
                            pie={
                              esMia ? (
                                <View style={styles.filaAcciones}>
                                  <Pressable
                                    onPress={() => editarMiResena(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Editar mi reseña"
                                    hitSlop={8}
                                    style={styles.accion}>
                                    <ThemedText type="smallBold">Editar</ThemedText>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => borrarMiResena(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Borrar mi reseña"
                                    hitSlop={8}
                                    style={styles.accion}>
                                    <ThemedText type="smallBold">Borrar</ThemedText>
                                  </Pressable>
                                </View>
                              ) : reportadas.includes(item.id) ? (
                                <ThemedText type="small" themeColor="textSecondary">
                                  Reportaste esta reseña.
                                </ThemedText>
                              ) : (
                                <Pressable
                                  onPress={() => reportar(item)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Reportar esta reseña como ofensiva"
                                  hitSlop={8}
                                  style={styles.accion}>
                                  <ThemedText type="small" themeColor="textSecondary">
                                    Reportar
                                  </ThemedText>
                                </Pressable>
                              )
                            }
                          />
                        );
                      }}
                    />
                  )}
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
  tiraFotos: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  fotoTira: {
    width: 140,
    height: 100,
    borderRadius: Spacing.two,
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
  botonResena: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Spacing.five,
  },
  filaAcciones: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  accion: {
    minHeight: 40,
    justifyContent: 'center',
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
