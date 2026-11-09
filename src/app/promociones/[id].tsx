import Ionicons from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, generarCodigo, obtenerComercio, obtenerPromocion } from '@/servicios';
import { useSesion } from '@/sesion/SesionProvider';
import { useRequiereCuenta } from '@/sesion/useRequiereCuenta';
import type { Comercio, Promocion, UsoDePromocion } from '@/tipos';
import { fechaConAnio } from '@/utilidades/fechas';
import { estaPorVencer, estadoPromocion } from '@/utilidades/promociones';

type Estado = 'cargando' | 'error' | 'listo';

const ALTO_IMAGEN = 180;
const ALTO_QR = 180;

// Detalle de una promoción: de qué se trata, hasta cuándo dura y qué condiciones tiene
// (lo que pide el PRD). Si es exclusiva de la app, permite pedir el código que el
// comercio verifica en el mostrador.
export default function DetallePromocionScreen() {
  // useLocalSearchParams siempre entrega texto; acá el id ya es texto ("pro-441").
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { usuario } = useSesion();
  const requerirCuenta = useRequiereCuenta();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [promocion, setPromocion] = useState<Promocion | null>(null);
  const [comercio, setComercio] = useState<Comercio | null>(null);

  // El código se pide con un botón; su estado es independiente de la carga de la pantalla.
  const [codigo, setCodigo] = useState<UsoDePromocion | null>(null);
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  // Mismo patrón que las otras pantallas: useFocusEffect + useCallback + bandera `cancelado`.
  // Primero se pide la promo y, con su `comercioId`, el comercio (por eso van encadenadas).
  const cargar = useCallback(() => {
    let cancelado = false;
    setEstado('cargando');

    obtenerPromocion(id)
      .then((promocionRecibida) =>
        obtenerComercio(promocionRecibida.comercioId).then(
          (comercioRecibido) => [promocionRecibida, comercioRecibido] as const,
        ),
      )
      .then(([promocionRecibida, comercioRecibido]) => {
        if (cancelado) return;
        setPromocion(promocionRecibida);
        setComercio(comercioRecibido);
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

  function pedirCodigo() {
    setErrorCodigo(null);
    setPidiendoCodigo(true);
    generarCodigo(id)
      .then(setCodigo)
      .catch((error: unknown) => {
        setErrorCodigo(error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.');
      })
      .finally(() => setPidiendoCodigo(false));
  }

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Promoción' }} />

      {estado === 'cargando' && (
        <View style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Cargando promoción…</ThemedText>
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
            style={[styles.boton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Reintentar</ThemedText>
          </Pressable>
        </View>
      )}

      {estado === 'listo' && promocion !== null && (
        <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
          <ScrollView contentContainerStyle={styles.contenido}>
            {promocion.imagenUrl !== null && (
              <Image
                source={{ uri: promocion.imagenUrl }}
                style={[styles.imagen, { backgroundColor: theme.backgroundElement }]}
                contentFit="cover"
              />
            )}

            <View style={styles.filaTitulo}>
              <ThemedText type="subtitle" style={styles.titulo}>
                {promocion.titulo}
              </ThemedText>
              {promocion.descuento !== null && (
                <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">{promocion.descuento}% OFF</ThemedText>
                </View>
              )}
            </View>

            {comercio !== null && (
              <Pressable
                onPress={() => router.push(`/comercios/${comercio.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Ver la ficha de ${comercio.nombre}`}
                hitSlop={8}
                style={styles.filaComercio}>
                <Ionicons name="storefront-outline" size={16} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">{comercio.nombre}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </Pressable>
            )}

            <View style={styles.seccion}>
              <ThemedText type="smallBold">Vigencia</ThemedText>
              <ThemedText>
                Del {fechaConAnio(promocion.desde)} al {fechaConAnio(promocion.hasta)}
              </ThemedText>
              {estadoPromocion(promocion) === 'proxima' && (
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no empezó.
                </ThemedText>
              )}
              {estaPorVencer(promocion) && (
                <ThemedText type="small" style={styles.avisoVence}>
                  Vence pronto.
                </ThemedText>
              )}
            </View>

            <View style={styles.seccion}>
              <ThemedText type="smallBold">Condiciones</ThemedText>
              <ThemedText>{promocion.detalle}</ThemedText>
            </View>

            <View style={styles.seccion}>
              <ThemedText type="smallBold">Cómo usarla</ThemedText>
              {!promocion.soloApp && (
                <ThemedText themeColor="textSecondary">
                  Esta promoción no necesita código: se aplica directo en el local.
                </ThemedText>
              )}

              {promocion.soloApp && usuario?.rol === 'comercio' && (
                <ThemedText themeColor="textSecondary">
                  Las cuentas de comercio no piden códigos: los validan en el mostrador.
                </ThemedText>
              )}

              {promocion.soloApp &&
                usuario?.rol !== 'comercio' &&
                estadoPromocion(promocion) === 'proxima' && (
                  <ThemedText themeColor="textSecondary">
                    Es exclusiva de la app. Vas a poder pedir tu código cuando empiece.
                  </ThemedText>
                )}

              {promocion.soloApp &&
                usuario?.rol !== 'comercio' &&
                estadoPromocion(promocion) === 'vigente' && (
                  <>
                    <ThemedText themeColor="textSecondary">
                      Es exclusiva de la app: mostrale tu código al comercio en el mostrador.
                    </ThemedText>

                    {codigo === null && (
                      <Pressable
                        onPress={() => requerirCuenta(pedirCodigo)}
                        disabled={pidiendoCodigo}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: pidiendoCodigo }}
                        style={[
                          styles.botonPrincipal,
                          { backgroundColor: theme.text, opacity: pidiendoCodigo ? 0.6 : 1 },
                        ]}>
                        <ThemedText type="smallBold" style={{ color: theme.background }}>
                          {pidiendoCodigo ? 'Pidiendo código…' : 'Mostrar mi código'}
                        </ThemedText>
                      </Pressable>
                    )}

                    {codigo !== null && (
                      <View style={[styles.cajaCodigo, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Tu código
                        </ThemedText>
                        <ThemedText
                          type="subtitle"
                          style={styles.codigo}
                          accessibilityLabel={`Tu código es ${codigo.codigo}`}>
                          {codigo.codigo}
                        </ThemedText>
                        {/* El mismo código como QR, para que el comercio lo escanee con la cámara.
                            Va sobre un recuadro blanco: un QR necesita fondo claro para leerse,
                            también con el tema oscuro. */}
                        <View style={styles.marcoQr} accessibilityLabel="Código QR de tu promoción">
                          <QRCode value={codigo.codigo} size={ALTO_QR} />
                        </View>
                      </View>
                    )}

                    {errorCodigo !== null && (
                      <ThemedText type="small" style={styles.error} accessibilityRole="alert">
                        {errorCodigo}
                      </ThemedText>
                    )}
                  </>
                )}
            </View>
          </ScrollView>
        </SafeAreaView>
      )}
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
  contenido: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  imagen: {
    width: '100%',
    height: ALTO_IMAGEN,
    borderRadius: Spacing.three,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titulo: {
    flex: 1,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  filaComercio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 48,
  },
  seccion: {
    gap: Spacing.one,
  },
  avisoVence: {
    color: '#F2A65A',
  },
  boton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    minHeight: 48,
    justifyContent: 'center',
  },
  botonPrincipal: {
    minHeight: 48,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaCodigo: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  codigo: {
    letterSpacing: 2,
  },
  marcoQr: {
    padding: Spacing.three,
    marginTop: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.two,
  },
  error: {
    color: '#C0392B',
  },
});
