import Ionicons from '@react-native-vector-icons/ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexion } from '@/components/AvisoDeConexion';
import { AvisoUbicacion } from '@/components/AvisoUbicacion';
import { FiltroRubros } from '@/components/FiltroRubros';
import { TarjetaComercio } from '@/components/TarjetaComercio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDirectorio } from '@/directorio/DirectorioProvider';
import { useUbicacion } from '@/ubicacion/UbicacionProvider';
import { distanciaEnMetros } from '@/utilidades/distancias';
import { regionAlrededorDe, regionQueAbarca } from '@/utilidades/mapa';

const COLOR_PERSONA = '#1E6FEB';

// Los comercios sobre un mapa, con la persona ubicada y un filtro por rubro (lo que pide el
// PRD). La ubicación es opcional: sin ella el mapa se ve igual, sólo que no aparece la persona.
export default function MapaScreen() {
  const theme = useTheme();
  const { posicion, actualizarSiHaceFalta } = useUbicacion();

  // Referencia al mapa: permite ordenarle desde el código "andá a esta región".
  const mapaRef = useRef<MapView>(null);

  // El directorio lo carga (y guarda en el teléfono) el DirectorioProvider.
  const { estado, comercios, rubros, mensajeError, recargar, reintentar } = useDirectorio();

  const [rubroSeleccionado, setRubroSeleccionado] = useState<string | null>(null);
  const [comercioElegidoId, setComercioElegidoId] = useState<string | null>(null);

  // Sólo para desarrollo (diagnóstico): el mapa avisa cuando el componente nativo arrancó
  // (onMapReady) y cuando terminó de bajar los mosaicos del mapa (onMapLoaded).
  const [mapaListo, setMapaListo] = useState(false);
  const [mapaCargado, setMapaCargado] = useState(false);

  // Al volver a esta pantalla se refrescan los datos. El mapa NO se desmonta al recargar (el
  // estado sólo pasa por "cargando" la primera vez): así no se pierde el zoom ni el comercio
  // elegido.
  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  useFocusEffect(
    useCallback(() => {
      void actualizarSiHaceFalta();
    }, [actualizarSiHaceFalta]),
  );

  // Datos derivados (no son estado): se recalculan a partir de lo que ya hay.
  const rubroPorId = new Map(rubros.map((rubro) => [rubro.id, rubro]));
  const visibles = comercios.filter(
    (comercio) => rubroSeleccionado === null || comercio.rubroId === rubroSeleccionado,
  );
  const comercioElegido = visibles.find((comercio) => comercio.id === comercioElegidoId) ?? null;

  // Al cambiar el filtro, el mapa se mueve para mostrar justo los comercios que quedaron.
  function elegirRubro(rubroId: string | null) {
    setRubroSeleccionado(rubroId);
    setComercioElegidoId(null);
    const quedan = comercios.filter((c) => rubroId === null || c.rubroId === rubroId);
    mapaRef.current?.animateToRegion(regionQueAbarca(quedan.map((c) => c.coordenadas)), 400);
  }

  function irAMiUbicacion() {
    if (posicion === null) return;
    mapaRef.current?.animateToRegion(regionAlrededorDe(posicion), 400);
  }

  return (
    <ThemedView style={styles.contenedor}>
      {estado === 'cargando' && (
        <View style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Cargando el mapa…</ThemedText>
        </View>
      )}

      {estado === 'error' && (
        <View style={styles.centrado}>
          <ThemedText themeColor="textSecondary" style={styles.textoCentrado}>
            {mensajeError}
          </ThemedText>
          <Pressable
            onPress={reintentar}
            accessibilityRole="button"
            hitSlop={8}
            style={[styles.botonReintentar, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Reintentar</ThemedText>
          </Pressable>
        </View>
      )}

      {estado === 'listo' && comercios.length === 0 && (
        <View style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Todavía no hay comercios para mostrar.</ThemedText>
        </View>
      )}

      {estado === 'listo' && comercios.length > 0 && (
        <>
          <MapView
            ref={mapaRef}
            style={StyleSheet.absoluteFill}
            // initialRegion se usa una sola vez, cuando el mapa aparece: arranca mostrando todos
            // los comercios.
            initialRegion={regionQueAbarca(comercios.map((c) => c.coordenadas))}
            toolbarEnabled={false}
            onMapReady={() => setMapaListo(true)}
            onMapLoaded={() => setMapaCargado(true)}
            // Tocar el fondo del mapa (no un marcador) cierra la tarjeta del comercio.
            onPress={() => setComercioElegidoId(null)}>
            {visibles.map((comercio) => (
              <Marker
                key={comercio.id}
                coordinate={{
                  latitude: comercio.coordenadas.latitud,
                  longitude: comercio.coordenadas.longitud,
                }}
                title={comercio.nombre}
                pinColor={rubroPorId.get(comercio.rubroId)?.color}
                onPress={() => setComercioElegidoId(comercio.id)}
                // Sin esto, tocar un marcador también contaría como tocar el fondo del mapa.
                stopPropagation
                // Los marcadores son imágenes fijas: no hace falta redibujarlos todo el tiempo.
                tracksViewChanges={false}
              />
            ))}

            {/* La persona. Se dibuja con la posición de la app (no con el punto azul del sistema)
                para que coincida con las distancias que se muestran, incluso con la ubicación
                simulada en desarrollo. */}
            {posicion !== null && (
              <Marker
                coordinate={{ latitude: posicion.latitud, longitude: posicion.longitud }}
                title="Estás acá"
                pinColor={COLOR_PERSONA}
                zIndex={10}
                tracksViewChanges={false}
              />
            )}
          </MapView>

          {/* Arriba del mapa: el filtro de rubros y, si hace falta, el aviso de la ubicación.
              pointerEvents="box-none": los toques que caen fuera de los controles pasan al mapa. */}
          <SafeAreaView style={styles.superior} edges={['top']} pointerEvents="box-none">
            <View style={[styles.panelFiltro, { backgroundColor: theme.background }]}>
              <FiltroRubros
                rubros={rubros}
                seleccionado={rubroSeleccionado}
                onElegir={elegirRubro}
              />
            </View>
            <AvisoUbicacion />
            <AvisoDeConexion />
            {__DEV__ && (
              <View style={[styles.diagnostico, { backgroundColor: theme.background }]}>
                <ThemedText type="small">
                  Diagnóstico · mapa {mapaListo ? 'iniciado' : 'SIN iniciar'} ·{' '}
                  {mapaCargado ? 'mosaicos cargados' : 'SIN mosaicos'} · comercios{' '}
                  {visibles.length}
                </ThemedText>
              </View>
            )}
          </SafeAreaView>

          <View style={styles.inferior} pointerEvents="box-none">
            {posicion !== null && (
              <Pressable
                onPress={irAMiUbicacion}
                accessibilityRole="button"
                accessibilityLabel="Ir a mi ubicación"
                style={[styles.botonUbicacion, { backgroundColor: theme.background }]}>
                <Ionicons name="locate" size={24} color={COLOR_PERSONA} />
              </Pressable>
            )}

            {comercioElegido !== null && (
              <Link href={`/comercios/${comercioElegido.id}`} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ficha de ${comercioElegido.nombre}`}
                  style={styles.tarjetaElegida}>
                  <TarjetaComercio
                    comercio={comercioElegido}
                    rubro={rubroPorId.get(comercioElegido.rubroId) ?? null}
                    distanciaM={
                      posicion === null
                        ? null
                        : distanciaEnMetros(posicion, comercioElegido.coordenadas)
                    }
                  />
                </Pressable>
              </Link>
            )}
          </View>
        </>
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
  botonReintentar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    minHeight: 48,
    justifyContent: 'center',
  },
  superior: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  panelFiltro: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  diagnostico: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  inferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  botonUbicacion: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  tarjetaElegida: {
    borderRadius: Spacing.three,
    elevation: 4,
  },
});
