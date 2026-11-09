import Ionicons from '@react-native-vector-icons/ionicons';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { editarMiComercio, ErrorApi, obtenerMiComercio, subirArchivo } from '@/servicios';
import type { Comercio } from '@/tipos';
import {
  agregarFoto,
  MAX_BYTES_FOTO,
  MAX_BYTES_VIDEO,
  MAXIMO_FOTOS,
  quitarFoto,
  type TipoMultimedia,
  validarTamano,
} from '@/utilidades/multimedia';

type Estado = 'cargando' | 'error' | 'listo';

const COLUMNAS = 3;
const ALTO_VIDEO = 200;
// Una foto de celular puede pesar 8 MB o más; con 0.7 se comprime y casi siempre queda
// bajo los 5 MB que acepta la API, sin que se note la diferencia.
const CALIDAD_FOTO = 0.7;
// Al grabar un video desde la cámara: 15 segundos para que no supere los 30 MB.
const SEGUNDOS_VIDEO = 15;

// Lo que se está haciendo ahora (subiendo un archivo, guardando un cambio). Mientras hay
// una tarea, los botones quedan desactivados.
interface Tarea {
  texto: string;
  progreso: number | null; // de 0 a 1, o null si no se puede medir
}

// Fotos y video del comercio. Cada cambio se guarda al instante: se sube el archivo
// (POST /archivos) y enseguida se manda su dirección en la ficha (PATCH /mi-comercio).
// Esta ruta sólo existe para cuentas de comercio (Stack.Protected en el layout raíz).
export default function MultimediaScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercio, setComercio] = useState<Comercio | null>(null);
  const [tarea, setTarea] = useState<Tarea | null>(null);

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

  // El reproductor se crea siempre (con source null si no hay video): los hooks no se pueden
  // llamar "a veces". Lo condicional es mostrar o no el <VideoView/>.
  const player = useVideoPlayer(comercio?.videoUrl ?? null, (reproductor) => {
    reproductor.loop = false;
  });

  function avisarError(error: unknown) {
    Alert.alert(
      'No se pudo completar',
      error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.',
    );
  }

  // Sube el archivo elegido y, si salió bien, lo agrega a la ficha.
  async function subirYGuardar(asset: ImagePicker.ImagePickerAsset, tipo: TipoMultimedia) {
    if (comercio === null) return;

    // Cuánto pesa, con la API nueva de archivos (`File.size`). Si no se puede saber, se usa lo
    // que informó el selector; y si tampoco, la API decide.
    let bytes: number | null = null;
    try {
      bytes = new File(asset.uri).size ?? asset.fileSize ?? null;
    } catch {
      bytes = asset.fileSize ?? null;
    }
    const problema = validarTamano(tipo, bytes);
    if (problema !== null) {
      Alert.alert('El archivo es muy pesado', problema);
      return;
    }

    const queEs = tipo === 'imagen' ? 'la foto' : 'el video';
    setTarea({ texto: `Subiendo ${queEs}…`, progreso: 0 });
    try {
      const subido = await subirArchivo(asset.uri, {
        mimeType: asset.mimeType,
        alAvanzar: (progreso) => setTarea({ texto: `Subiendo ${queEs}…`, progreso }),
      });

      setTarea({ texto: 'Guardando…', progreso: null });
      const actualizado = await editarMiComercio(
        tipo === 'imagen'
          ? { imagenes: agregarFoto(comercio.imagenes, subido.url) }
          : { videoUrl: subido.url },
      );
      setComercio(actualizado);
    } catch (e) {
      avisarError(e);
    } finally {
      setTarea(null);
    }
  }

  // La cámara pide permiso. La galería no lo necesita: usa el selector del sistema.
  async function conseguirPermisoDeCamara(): Promise<boolean> {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        'Sin permiso para la cámara',
        'Podés elegir el archivo desde la galería, o dar permiso a la cámara desde los Ajustes del teléfono.',
      );
    }
    return permiso.granted;
  }

  async function elegirFoto(origen: 'galeria' | 'camara') {
    if (comercio === null) return;
    if (comercio.imagenes.length >= MAXIMO_FOTOS) {
      Alert.alert('Ya tenés 8 fotos', 'Quitá alguna para poder agregar otra.');
      return;
    }
    if (origen === 'camara' && !(await conseguirPermisoDeCamara())) return;

    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: CALIDAD_FOTO,
    };
    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);

    if (!resultado.canceled) await subirYGuardar(resultado.assets[0], 'imagen');
  }

  async function elegirVideo(origen: 'galeria' | 'camara') {
    if (origen === 'camara' && !(await conseguirPermisoDeCamara())) return;

    const opciones: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      videoMaxDuration: SEGUNDOS_VIDEO,
    };
    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);

    if (!resultado.canceled) await subirYGuardar(resultado.assets[0], 'video');
  }

  // Quitar no borra el archivo del servidor: sólo lo saca de la ficha.
  async function aplicarCambio(cambios: { imagenes: string[] } | { videoUrl: null }) {
    setTarea({ texto: 'Guardando…', progreso: null });
    try {
      setComercio(await editarMiComercio(cambios));
    } catch (e) {
      avisarError(e);
    } finally {
      setTarea(null);
    }
  }

  function confirmarQuitarFoto(url: string) {
    if (comercio === null) return;
    Alert.alert('Quitar foto', '¿Querés sacar esta foto de tu ficha?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => void aplicarCambio({ imagenes: quitarFoto(comercio.imagenes, url) }),
      },
    ]);
  }

  function confirmarQuitarVideo() {
    Alert.alert('Quitar video', '¿Querés sacar el video de tu ficha?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => void aplicarCambio({ videoUrl: null }),
      },
    ]);
  }

  const ocupado = tarea !== null;
  // Ancho de cada foto de la grilla: el ancho de la pantalla menos los márgenes y los huecos.
  const lado = (width - Spacing.four * 2 - Spacing.two * (COLUMNAS - 1)) / COLUMNAS;

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Fotos y video' }} />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        {estado === 'cargando' && (
          <View style={styles.centrado}>
            <ThemedText themeColor="textSecondary">Cargando…</ThemedText>
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

        {estado === 'listo' && comercio !== null && (
          <ScrollView contentContainerStyle={styles.contenido}>
            <ThemedText type="small" themeColor="textSecondary">
              Los cambios se guardan al instante. Fotos JPG, PNG o WEBP de hasta{' '}
              {MAX_BYTES_FOTO / (1024 * 1024)} MB; video MP4 de hasta{' '}
              {MAX_BYTES_VIDEO / (1024 * 1024)} MB.
            </ThemedText>

            {tarea !== null && (
              <View style={[styles.tarea, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">
                  {tarea.texto}
                  {tarea.progreso !== null ? ` ${Math.round(tarea.progreso * 100)}%` : ''}
                </ThemedText>
                {tarea.progreso !== null && (
                  <View style={[styles.barraFondo, { backgroundColor: theme.backgroundSelected }]}>
                    <View
                      style={[
                        styles.barra,
                        { backgroundColor: theme.text, width: `${Math.round(tarea.progreso * 100)}%` },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            <ThemedText type="smallBold">
              Fotos ({comercio.imagenes.length} de {MAXIMO_FOTOS})
            </ThemedText>

            {comercio.imagenes.length === 0 ? (
              <ThemedText themeColor="textSecondary">Todavía no cargaste fotos.</ThemedText>
            ) : (
              <View style={styles.grilla}>
                {comercio.imagenes.map((url) => (
                  <View key={url} style={{ width: lado, height: lado }}>
                    <Image
                      source={{ uri: url }}
                      style={[styles.foto, { backgroundColor: theme.backgroundElement }]}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => confirmarQuitarFoto(url)}
                      disabled={ocupado}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar esta foto"
                      hitSlop={6}
                      style={styles.botonQuitarFoto}>
                      <Ionicons name="close-circle" size={26} color="#C0392B" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.filaBotones}>
              <Pressable
                onPress={() => void elegirFoto('galeria')}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityState={{ disabled: ocupado }}
                style={[styles.boton, { backgroundColor: theme.text, opacity: ocupado ? 0.5 : 1 }]}>
                <Ionicons name="images-outline" size={18} color={theme.background} />
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Galería
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void elegirFoto('camara')}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityState={{ disabled: ocupado }}
                style={[styles.boton, { backgroundColor: theme.text, opacity: ocupado ? 0.5 : 1 }]}>
                <Ionicons name="camera-outline" size={18} color={theme.background} />
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Sacar foto
                </ThemedText>
              </Pressable>
            </View>

            <View style={[styles.separador, { backgroundColor: theme.backgroundElement }]} />

            <ThemedText type="smallBold">Video</ThemedText>

            {comercio.videoUrl !== null ? (
              <>
                <VideoView player={player} style={styles.video} nativeControls />
                <Pressable
                  onPress={confirmarQuitarVideo}
                  disabled={ocupado}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: ocupado }}
                  style={[styles.botonSecundario, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">Quitar el video</ThemedText>
                </Pressable>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">Todavía no cargaste un video.</ThemedText>
            )}

            <View style={styles.filaBotones}>
              <Pressable
                onPress={() => void elegirVideo('galeria')}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityState={{ disabled: ocupado }}
                style={[styles.boton, { backgroundColor: theme.text, opacity: ocupado ? 0.5 : 1 }]}>
                <Ionicons name="film-outline" size={18} color={theme.background} />
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  {comercio.videoUrl !== null ? 'Cambiar video' : 'Elegir video'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void elegirVideo('camara')}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityState={{ disabled: ocupado }}
                style={[styles.boton, { backgroundColor: theme.text, opacity: ocupado ? 0.5 : 1 }]}>
                <Ionicons name="videocam-outline" size={18} color={theme.background} />
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Grabar video
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
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
  contenido: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  tarea: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  barraFondo: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barra: {
    height: 8,
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  foto: {
    width: '100%',
    height: '100%',
    borderRadius: Spacing.two,
  },
  botonQuitarFoto: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  boton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 48,
    borderRadius: Spacing.five,
  },
  botonSecundario: {
    minHeight: 48,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: ALTO_VIDEO,
    borderRadius: Spacing.three,
  },
  separador: {
    height: 2,
    marginVertical: Spacing.two,
  },
});
