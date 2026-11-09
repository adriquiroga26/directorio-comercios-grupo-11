import Ionicons from '@react-native-vector-icons/ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, listarMisPromociones, validarCodigo } from '@/servicios';
import { fechaConAnio } from '@/utilidades/fechas';

type Resultado =
  | { tipo: 'ok'; codigo: string; promocion: string | null; fecha: string }
  | { tipo: 'error'; mensaje: string };

const ALTO_CAMARA = 320;

// Pide el nombre de la promo para mostrarlo en el resultado. Es un extra: si falla, el código
// igual quedó validado y se muestra sin el nombre.
function nombreDePromocion(promocionId: string): Promise<string | null> {
  return listarMisPromociones()
    .then((promociones) => promociones.find((p) => p.id === promocionId)?.titulo ?? null)
    .catch(() => null);
}

// El comercio valida en el mostrador el código que le muestra un cliente: escaneando su QR con
// la cámara o escribiéndolo a mano (así la pantalla sirve aunque no se dé permiso a la cámara).
// Esta ruta sólo existe para cuentas de comercio (Stack.Protected en el layout raíz).
export default function ValidarCodigoScreen() {
  const theme = useTheme();
  const [permiso, pedirPermiso] = useCameraPermissions();

  const [codigoEscrito, setCodigoEscrito] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // La cámara avisa MUCHAS veces por segundo mientras ve el QR. Este "semáforo" corta los avisos
  // repetidos al instante (un useState se actualiza recién en el siguiente dibujo).
  const enCurso = useRef(false);

  async function validar(texto: string) {
    const codigo = texto.trim();
    if (codigo === '' || enCurso.current) return;

    enCurso.current = true;
    setProcesando(true);
    try {
      const uso = await validarCodigo(codigo);
      const promocion = await nombreDePromocion(uso.promocionId);
      // Una vibración corta de "todo bien": el comercio la siente aunque no mire la pantalla.
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCodigoEscrito('');
      setResultado({
        tipo: 'ok',
        codigo: uso.codigo,
        promocion,
        fecha: uso.validadoEn === null ? '' : fechaConAnio(uso.validadoEn),
      });
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({
        tipo: 'error',
        // El mensaje de la API ya está listo para mostrar (por ejemplo "Ese código ya se usó.").
        mensaje: error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.',
      });
    } finally {
      setProcesando(false);
    }
  }

  function nuevoEscaneo() {
    setResultado(null);
    enCurso.current = false;
  }

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Validar código' }} />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          {resultado === null ? (
            <>
              {/* Tres casos del permiso de la cámara: todavía no se sabe, concedido, o no concedido. */}
              {permiso === null && (
                <ThemedText themeColor="textSecondary">Preparando la cámara…</ThemedText>
              )}

              {permiso !== null && permiso.granted && (
                <>
                  <View style={[styles.cajaCamara, { backgroundColor: theme.backgroundElement }]}>
                    <CameraView
                      style={styles.camara}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      // Mientras se valida un código se dejan de procesar los avisos de la cámara.
                      onBarcodeScanned={procesando ? undefined : ({ data }) => void validar(data)}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                    {procesando ? 'Validando…' : 'Apuntá la cámara al código QR del cliente.'}
                  </ThemedText>
                </>
              )}

              {permiso !== null && !permiso.granted && (
                <View style={[styles.cajaPermiso, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="camera-outline" size={32} color={theme.text} />
                  <ThemedText style={styles.centrado}>
                    Para escanear el QR hace falta usar la cámara. También podés escribir el código
                    a mano, abajo.
                  </ThemedText>
                  {permiso.canAskAgain ? (
                    <Pressable
                      onPress={pedirPermiso}
                      accessibilityRole="button"
                      style={[styles.boton, { backgroundColor: theme.text }]}>
                      <ThemedText type="smallBold" style={{ color: theme.background }}>
                        Permitir el uso de la cámara
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <>
                      {/* canAskAgain en false: el sistema ya no muestra el cartel; sólo se
                          cambia desde Ajustes. */}
                      <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                        El permiso está bloqueado. Se activa desde los Ajustes del teléfono.
                      </ThemedText>
                      <Pressable
                        onPress={() => Linking.openSettings()}
                        accessibilityRole="button"
                        style={[styles.boton, { backgroundColor: theme.text }]}>
                        <ThemedText type="smallBold" style={{ color: theme.background }}>
                          Abrir Ajustes
                        </ThemedText>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              <View style={styles.grupo}>
                <ThemedText type="smallBold">O escribí el código</ThemedText>
                <TextInput
                  value={codigoEscrito}
                  onChangeText={setCodigoEscrito}
                  placeholder="CCU-XXXX-XXXX"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel="Código de la promoción"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.campo, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
                <Pressable
                  onPress={() => void validar(codigoEscrito)}
                  disabled={procesando || codigoEscrito.trim() === ''}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: procesando || codigoEscrito.trim() === '' }}
                  style={[
                    styles.boton,
                    {
                      backgroundColor: theme.text,
                      opacity: procesando || codigoEscrito.trim() === '' ? 0.5 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                    {procesando ? 'Validando…' : 'Validar código'}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={[styles.cajaResultado, { backgroundColor: theme.backgroundElement }]}>
              {resultado.tipo === 'ok' ? (
                <>
                  <Ionicons name="checkmark-circle" size={56} color="#2E9E5B" />
                  <ThemedText type="subtitle" style={styles.centrado}>
                    Código válido
                  </ThemedText>
                  {resultado.promocion !== null && (
                    <ThemedText style={styles.centrado}>{resultado.promocion}</ThemedText>
                  )}
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                    {resultado.codigo}
                    {resultado.fecha !== '' ? ` · ${resultado.fecha}` : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                    El uso quedó registrado.
                  </ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="close-circle" size={56} color="#C0392B" />
                  <ThemedText type="smallBold" style={[styles.centrado, styles.error]} accessibilityRole="alert">
                    {resultado.mensaje}
                  </ThemedText>
                </>
              )}

              <Pressable
                onPress={nuevoEscaneo}
                accessibilityRole="button"
                style={[styles.boton, { backgroundColor: theme.text }]}>
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  {resultado.tipo === 'ok' ? 'Validar otro código' : 'Intentar de nuevo'}
                </ThemedText>
              </Pressable>
            </View>
          )}
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
  cajaCamara: {
    height: ALTO_CAMARA,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  camara: {
    flex: 1,
  },
  cajaPermiso: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  cajaResultado: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  centrado: {
    textAlign: 'center',
  },
  grupo: {
    gap: Spacing.two,
  },
  campo: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    letterSpacing: 1,
  },
  boton: {
    minHeight: 48,
    minWidth: 220,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#C0392B',
  },
});
