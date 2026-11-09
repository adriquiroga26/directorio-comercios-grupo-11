import Ionicons from '@react-native-vector-icons/ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoUbicacion } from '@/components/AvisoUbicacion';
import { FiltroRubros } from '@/components/FiltroRubros';
import { TarjetaComercio } from '@/components/TarjetaComercio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, listarComercios, listarRubros, type Simulacion, setSimulacion } from '@/servicios';
import type { Comercio, Rubro } from '@/tipos';
import { useUbicacion } from '@/ubicacion/UbicacionProvider';
import { distanciasDesde, ordenarPorDistancia } from '@/utilidades/distancias';
import { calcularApertura } from '@/utilidades/horarios';

type Estado = 'cargando' | 'error' | 'listo';

// Sólo desarrollo: el centro de Concepción del Uruguay, donde están los comercios de la API.
const CENTRO_CONCEPCION = { latitud: -32.4825, longitud: -58.2372 };

export default function BuscarScreen() {
  const theme = useTheme();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [rubroSeleccionado, setRubroSeleccionado] = useState<string | null>(null);
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [masCercaPrimero, setMasCercaPrimero] = useState(false);

  // La ubicación es opcional: sin ella la pantalla funciona igual, sin distancias.
  const { estado: estadoUbicacion, posicion, actualizarSiHaceFalta, simularPosicion } = useUbicacion();

  // Al volver a esta pantalla, si la posición quedó vieja (la persona caminó), se refresca.
  useFocusEffect(
    useCallback(() => {
      void actualizarSiHaceFalta();
    }, [actualizarSiHaceFalta]),
  );

  // useFocusEffect (no useEffect con []) porque el PRD quiere los datos
  // actualizados cada vez que se vuelve a esta pantalla, no sólo la primera vez.
  // La limpieza (cancelado = true) evita guardar la respuesta si el usuario
  // ya se fue de la pantalla antes de que termine de "llegar" el mock.
  const cargar = useCallback(() => {
    let cancelado = false;
    setEstado('cargando');

    Promise.all([listarComercios(), listarRubros()])
      .then(([comerciosRecibidos, rubrosRecibidos]) => {
        if (cancelado) return;
        setComercios(comerciosRecibidos);
        setRubros(rubrosRecibidos);
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

  // Todo esto se recalcula en cada render a partir de los datos y los
  // filtros: no es estado porque se puede derivar de lo que ya tenemos
  // (incluida la hora actual para "abierto ahora").
  const rubroPorId = new Map(rubros.map((rubro) => [rubro.id, rubro]));
  const textoBusqueda = busqueda.trim().toLowerCase();

  const comerciosFiltrados = comercios.filter((comercio) => {
    const coincideTexto =
      textoBusqueda.length === 0 ||
      comercio.nombre.toLowerCase().includes(textoBusqueda) ||
      comercio.descripcion.toLowerCase().includes(textoBusqueda);
    const coincideRubro = rubroSeleccionado === null || comercio.rubroId === rubroSeleccionado;
    const coincideAbierto = !soloAbiertos || calcularApertura(comercio).abierto;
    return coincideTexto && coincideRubro && coincideAbierto;
  });

  // Con la posición conocida se calcula la distancia a cada comercio (la API no la devuelve) y,
  // si la persona lo pidió, se ordena del más cerca al más lejos. Sin posición: sin distancias.
  const distancias = posicion === null ? null : distanciasDesde(posicion, comerciosFiltrados);
  const comerciosAMostrar =
    distancias !== null && masCercaPrimero
      ? ordenarPorDistancia(comerciosFiltrados, distancias)
      : comerciosFiltrados;

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      <View style={styles.encabezado}>
        <View style={[styles.buscador, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar en la ciudad"
            placeholderTextColor={theme.textSecondary}
            style={[styles.entradaTexto, { color: theme.text }]}
          />
        </View>

        <FiltroRubros
          rubros={rubros}
          seleccionado={rubroSeleccionado}
          onElegir={setRubroSeleccionado}
        />

        {/* Los dos interruptores van en la misma fila (flexWrap: si no entran, el segundo
            baja solo) para dejarle más lugar a la lista. */}
        <View style={styles.filaSwitches}>
          <Pressable
            onPress={() => setSoloAbiertos((valor) => !valor)}
            accessibilityRole="switch"
            accessibilityState={{ checked: soloAbiertos }}
            accessibilityLabel="Mostrar sólo los comercios abiertos ahora"
            hitSlop={8}
            style={styles.filaSwitch}>
            {/* pointerEvents="none": el toque lo maneja el Pressable de arriba,
                así evitamos que tocar el switch dispare el cambio dos veces. */}
            <Switch value={soloAbiertos} pointerEvents="none" />
            <ThemedText type="small">Abierto ahora</ThemedText>
          </Pressable>

          {estadoUbicacion === 'lista' && (
            <Pressable
              onPress={() => setMasCercaPrimero((valor) => !valor)}
              accessibilityRole="switch"
              accessibilityState={{ checked: masCercaPrimero }}
              accessibilityLabel="Ordenar los comercios del más cerca al más lejos"
              hitSlop={8}
              style={styles.filaSwitch}>
              <Switch value={masCercaPrimero} pointerEvents="none" />
              <ThemedText type="small">Más cerca primero</ThemedText>
            </Pressable>
          )}
        </View>

        {estadoUbicacion !== 'lista' && <AvisoUbicacion />}
      </View>

      {estado === 'cargando' && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Cargando comercios…</ThemedText>
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

      {estado === 'listo' && comercios.length === 0 && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Todavía no hay comercios cargados.</ThemedText>
        </ThemedView>
      )}

      {estado === 'listo' && comercios.length > 0 && comerciosFiltrados.length === 0 && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">No encontramos comercios con ese filtro.</ThemedText>
        </ThemedView>
      )}

      {estado === 'listo' && comerciosAMostrar.length > 0 && (
        <FlatList
          data={comerciosAMostrar}
          keyExtractor={(comercio) => comercio.id}
          contentContainerStyle={styles.listado}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderItem={({ item }) => (
            <Link href={`/comercios/${item.id}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${item.nombre}`}>
                <TarjetaComercio
                  comercio={item}
                  rubro={rubroPorId.get(item.rubroId) ?? null}
                  distanciaM={distancias?.get(item.id) ?? null}
                />
              </Pressable>
            </Link>
          )}
        />
      )}

      {__DEV__ && (
        <View style={[styles.filaDev, { borderTopColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Sólo desarrollo:
          </ThemedText>
          {(['normal', 'error', 'demora'] as Simulacion[]).map((modo) => (
            <Pressable
              key={modo}
              onPress={() => {
                setSimulacion(modo);
                cargar();
              }}
              hitSlop={8}
              style={[styles.botonDev, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{modo}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {__DEV__ && (
        <View style={[styles.filaDev, { borderTopColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Ubicación:
          </ThemedText>
          <Pressable
            onPress={() => simularPosicion(null)}
            hitSlop={8}
            style={[styles.botonDev, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">GPS real</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => simularPosicion(CENTRO_CONCEPCION)}
            hitSlop={8}
            style={[styles.botonDev, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">Centro de Concepción</ThemedText>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  encabezado: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  entradaTexto: {
    flex: 1,
    fontSize: 16,
  },
  filaSwitches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.four,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
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
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  filaDev: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
  },
  botonDev: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
