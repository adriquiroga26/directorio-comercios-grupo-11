import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectorDia } from '@/components/SelectorDia';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { crearPromocion, editarPromocion, ErrorApi } from '@/servicios';
import type { DatosPromocion } from '@/tipos';
import { fechaDeIso } from '@/utilidades/fechas';
import { finDelDiaIso, inicioDelDiaIso, validarPromocion } from '@/utilidades/promociones';

// Dentro de 7 días: la vigencia que se propone al crear una promo nueva.
function dentroDeUnaSemana(): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  return fecha;
}

// Formulario para crear una promoción o editar una existente. Se abre como modal desde
// "Mis promociones". Si llega `id`, es una edición y los campos arrancan con lo que ya había.
export default function PromocionFormScreen() {
  // Los parámetros de la ruta SIEMPRE llegan como texto.
  const {
    id,
    titulo: tituloParam,
    detalle: detalleParam,
    descuento: descuentoParam,
    desde: desdeParam,
    hasta: hastaParam,
    soloApp: soloAppParam,
  } = useLocalSearchParams<{
    id?: string;
    titulo?: string;
    detalle?: string;
    descuento?: string;
    desde?: string;
    hasta?: string;
    soloApp?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();

  const esEdicion = id !== undefined;

  const [titulo, setTitulo] = useState(tituloParam ?? '');
  const [detalle, setDetalle] = useState(detalleParam ?? '');
  const [descuento, setDescuento] = useState(descuentoParam ?? '');
  const [desde, setDesde] = useState(() => (desdeParam ? fechaDeIso(desdeParam) : new Date()));
  const [hasta, setHasta] = useState(() => (hastaParam ? fechaDeIso(hastaParam) : dentroDeUnaSemana()));
  const [soloApp, setSoloApp] = useState(soloAppParam === 'si');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    // Primero se valida acá, para avisar al instante sin hacer un pedido que va a fallar.
    const problema = validarPromocion({ titulo, detalle, descuento, desde, hasta });
    if (problema !== null) {
      setError(problema);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      // La API pide fecha y hora con zona: cada promo empieza a las 00:00 del día elegido
      // y termina a las 23:59 del día elegido, en hora de Argentina.
      const datos: DatosPromocion = {
        titulo: titulo.trim(),
        detalle: detalle.trim(),
        descuento: descuento.trim() === '' ? null : Number(descuento.trim()),
        desde: inicioDelDiaIso(desde),
        hasta: finDelDiaIso(hasta),
        soloApp,
      };
      if (esEdicion) {
        await editarPromocion(id, datos);
      } else {
        await crearPromocion(datos);
      }
      // La lista se actualiza sola al volver (recarga cuando recibe el foco).
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  const estiloCampo = [styles.campo, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen
        options={{ headerShown: true, title: esEdicion ? 'Editar promoción' : 'Nueva promoción' }}
      />
      <SafeAreaView style={styles.contenedor} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <View style={styles.grupo}>
            <ThemedText type="smallBold">Título</ThemedText>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Por ejemplo: 15% en pinturas"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Título"
              maxLength={120}
              style={estiloCampo}
            />
          </View>

          <View style={styles.grupo}>
            <ThemedText type="smallBold">Detalle y condiciones</ThemedText>
            <TextInput
              value={detalle}
              onChangeText={setDetalle}
              placeholder="De qué se trata y qué condiciones tiene"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Detalle y condiciones"
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={[...estiloCampo, styles.campoLargo]}
            />
          </View>

          <View style={styles.grupo}>
            <ThemedText type="smallBold">Descuento (opcional)</ThemedText>
            <TextInput
              value={descuento}
              onChangeText={setDescuento}
              placeholder="Porcentaje entero, por ejemplo 15"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Descuento en porcentaje"
              keyboardType="number-pad"
              maxLength={3}
              style={estiloCampo}
            />
          </View>

          <SelectorDia etiqueta="Desde" valor={desde} onCambio={setDesde} />
          <SelectorDia etiqueta="Hasta" valor={hasta} onCambio={setHasta} />

          <View style={styles.filaSwitch}>
            <View style={styles.textoSwitch}>
              <ThemedText type="smallBold">Exclusiva de la app</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                El vecino pide un código en la app y el comercio lo valida en el mostrador.
              </ThemedText>
            </View>
            <Switch value={soloApp} onValueChange={setSoloApp} accessibilityLabel="Exclusiva de la app" />
          </View>

          {error !== null && (
            <ThemedText type="small" style={styles.error} accessibilityRole="alert">
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={guardar}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityState={{ disabled: enviando }}
            style={[styles.botonPrincipal, { backgroundColor: theme.text, opacity: enviando ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear promoción'}
            </ThemedText>
          </Pressable>
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
  grupo: {
    gap: Spacing.one,
  },
  campo: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  campoLargo: {
    minHeight: 120,
    paddingVertical: Spacing.three,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textoSwitch: {
    flex: 1,
    gap: Spacing.half,
  },
  error: {
    color: '#C0392B',
  },
  botonPrincipal: {
    minHeight: 48,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
