import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaPromocion } from '@/components/TarjetaPromocion';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi, listarComercios, listarPromociones, listarRubros } from '@/servicios';
import type { Comercio, Promocion, Rubro } from '@/tipos';
import { estadoPromocion } from '@/utilidades/promociones';

type Estado = 'cargando' | 'error' | 'listo';

interface ChipRubro {
  id: string | null;
  nombre: string;
}

interface Seccion {
  title: string;
  data: Promocion[];
}

export default function PromosScreen() {
  const theme = useTheme();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState<string | null>(null);

  const cargar = useCallback(() => {
    let cancelado = false;
    setEstado('cargando');

    Promise.all([listarPromociones(), listarComercios(), listarRubros()])
      .then(([promocionesRecibidas, comerciosRecibidos, rubrosRecibidos]) => {
        if (cancelado) return;
        setPromociones(promocionesRecibidas);
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

  const comercioPorId = new Map(comercios.map((comercio) => [comercio.id, comercio]));
  const chips: ChipRubro[] = [{ id: null, nombre: 'Todos' }, ...rubros];

  const promocionesFiltradas = promociones.filter((promocion) => {
    if (rubroSeleccionado === null) return true;
    return comercioPorId.get(promocion.comercioId)?.rubroId === rubroSeleccionado;
  });

  const secciones: Seccion[] = [
    { title: 'Vigentes', data: promocionesFiltradas.filter((p) => estadoPromocion(p) === 'vigente') },
    { title: 'Próximas', data: promocionesFiltradas.filter((p) => estadoPromocion(p) === 'proxima') },
  ].filter((seccion) => seccion.data.length > 0);

  return (
    <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
      <View style={styles.encabezado}>
        <ThemedText type="subtitle">Promos</ThemedText>

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
                accessibilityLabel={`Filtrar promociones por rubro ${item.nombre}`}
                hitSlop={8}
                style={[
                  styles.chip,
                  { backgroundColor: seleccionado ? theme.text : theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={{ color: seleccionado ? theme.background : theme.text }}>
                  {item.nombre}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </View>

      {estado === 'cargando' && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Cargando promociones…</ThemedText>
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

      {estado === 'listo' && promociones.length === 0 && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">Todavía no hay promociones cargadas.</ThemedText>
        </ThemedView>
      )}

      {estado === 'listo' && promociones.length > 0 && secciones.length === 0 && (
        <ThemedView style={styles.centrado}>
          <ThemedText themeColor="textSecondary">No hay promociones con ese filtro.</ThemedText>
        </ThemedView>
      )}

      {estado === 'listo' && secciones.length > 0 && (
        <SectionList
          sections={secciones}
          keyExtractor={(promocion) => promocion.id}
          contentContainerStyle={styles.listado}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" style={styles.tituloSeccion}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <TarjetaPromocion promocion={item} comercio={comercioPorId.get(item.comercioId) ?? null} />
          )}
        />
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
  tituloSeccion: {
    paddingVertical: Spacing.two,
  },
});
