import Ionicons from '@react-native-vector-icons/ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaComercio } from '@/components/TarjetaComercio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, listarComercios, listarRubros, type ModoMock, setModoMock } from '@/servicios';
import type { Comercio, Rubro } from '@/tipos';
import { calcularApertura } from '@/utilidades/horarios';

type Estado = 'cargando' | 'error' | 'listo';

// Chip "Todos" + un chip por rubro. id null = sin filtro de rubro.
interface ChipRubro {
  id: string | null;
  nombre: string;
}

export default function BuscarScreen() {
  const theme = useTheme();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [rubroSeleccionado, setRubroSeleccionado] = useState<string | null>(null);
  const [soloAbiertos, setSoloAbiertos] = useState(false);

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
  const chips: ChipRubro[] = [{ id: null, nombre: 'Todos' }, ...rubros];
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

        <FlatList
          data={chips}
          keyExtractor={(chip) => chip.id ?? 'todos'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filaChips}
          renderItem={({ item }) => {
            const seleccionado = item.id === rubroSeleccionado;
            return (
              <Pressable
                onPress={() => setRubroSeleccionado(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por rubro ${item.nombre}`}
                hitSlop={8}
                style={[
                  styles.chip,
                  { backgroundColor: seleccionado ? theme.text : theme.backgroundElement },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: seleccionado ? theme.background : theme.text }}>
                  {item.nombre}
                </ThemedText>
              </Pressable>
            );
          }}
        />

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

      {estado === 'listo' && comerciosFiltrados.length > 0 && (
        <FlatList
          data={comerciosFiltrados}
          keyExtractor={(comercio) => comercio.id}
          contentContainerStyle={styles.listado}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderItem={({ item }) => (
            <Link href={`/comercios/${item.id}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${item.nombre}`}>
                <TarjetaComercio comercio={item} rubro={rubroPorId.get(item.rubroId) ?? null} />
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
          {(['normal', 'vacio', 'error'] as ModoMock[]).map((modo) => (
            <Pressable
              key={modo}
              onPress={() => {
                setModoMock(modo);
                cargar();
              }}
              hitSlop={8}
              style={[styles.botonDev, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">{modo}</ThemedText>
            </Pressable>
          ))}
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
  filaChips: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    minHeight: 32,
    justifyContent: 'center',
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
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
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  botonDev: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
