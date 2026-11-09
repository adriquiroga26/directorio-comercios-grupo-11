import Ionicons from '@react-native-vector-icons/ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { editarMiComercio, ErrorApi, obtenerMiComercio } from '@/servicios';
import type { Comercio, MedioDePago } from '@/tipos';
import {
  cambiosDeFicha,
  camposDeComercio,
  ETIQUETA_MEDIO_DE_PAGO,
  LARGO_MAXIMO_DESCRIPCION,
  LARGO_MAXIMO_DIRECCION,
  LARGO_MAXIMO_NOMBRE,
  LARGO_MAXIMO_TELEFONO,
  MEDIOS_DE_PAGO,
  validarFicha,
} from '@/utilidades/ficha';

type Estado = 'cargando' | 'error' | 'listo';

// Edición de la ficha del comercio: nombre, descripción, dirección, contactos y medios de
// pago. Los horarios y las vacaciones se editan en otra pantalla. Esta ruta sólo existe para
// cuentas de comercio (Stack.Protected en el layout raíz).
export default function EditarFichaScreen() {
  const theme = useTheme();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [comercio, setComercio] = useState<Comercio | null>(null);

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

  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ headerShown: true, title: 'Datos del comercio' }} />
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

        {estado === 'listo' && comercio !== null && <FormularioFicha comercio={comercio} />}
      </SafeAreaView>
    </ThemedView>
  );
}

// Va aparte para que sus campos arranquen con lo guardado: useState toma el valor inicial
// una sola vez, así que el formulario recién se arma cuando el comercio ya llegó.
function FormularioFicha({ comercio }: { comercio: Comercio }) {
  const theme = useTheme();
  const router = useRouter();

  const inicial = camposDeComercio(comercio);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [direccion, setDireccion] = useState(inicial.direccion);
  const [telefono, setTelefono] = useState(inicial.telefono);
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp);
  const [instagram, setInstagram] = useState(inicial.instagram);
  const [mediosDePago, setMediosDePago] = useState<MedioDePago[]>(inicial.mediosDePago);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Marcar o desmarcar un medio: se agrega a la lista o se saca de ella.
  function alternarMedio(medio: MedioDePago) {
    setMediosDePago((actuales) =>
      actuales.includes(medio) ? actuales.filter((m) => m !== medio) : [...actuales, medio],
    );
  }

  async function guardar() {
    const campos = { nombre, descripcion, direccion, telefono, whatsapp, instagram, mediosDePago };

    // Primero se valida acá, para avisar al instante sin hacer un pedido que va a fallar.
    const problema = validarFicha(campos);
    if (problema !== null) {
      setError(problema);
      return;
    }

    // Sólo se manda lo que cambió. Si no cambió nada, no hay nada que guardar.
    const cambios = cambiosDeFicha(comercio, campos);
    if (Object.keys(cambios).length === 0) {
      setError('No hay cambios para guardar.');
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await editarMiComercio(cambios);
      // El panel se actualiza solo al volver (recarga cuando recibe el foco).
      router.back();
    } catch (e) {
      // El mensaje de ErrorApi viene de la API y está listo para mostrar.
      setError(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  const estiloCampo = [styles.campo, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.grupo}>
        <ThemedText type="smallBold">Nombre</ThemedText>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          accessibilityLabel="Nombre del comercio"
          maxLength={LARGO_MAXIMO_NOMBRE}
          style={estiloCampo}
        />
      </View>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">Descripción</ThemedText>
        <TextInput
          value={descripcion}
          onChangeText={setDescripcion}
          accessibilityLabel="Descripción"
          multiline
          maxLength={LARGO_MAXIMO_DESCRIPCION}
          textAlignVertical="top"
          style={[...estiloCampo, styles.campoLargo]}
        />
      </View>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">Dirección</ThemedText>
        <TextInput
          value={direccion}
          onChangeText={setDireccion}
          accessibilityLabel="Dirección"
          maxLength={LARGO_MAXIMO_DIRECCION}
          style={estiloCampo}
        />
      </View>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">Teléfono (opcional)</ThemedText>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          accessibilityLabel="Teléfono"
          keyboardType="phone-pad"
          maxLength={LARGO_MAXIMO_TELEFONO}
          style={estiloCampo}
        />
      </View>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">WhatsApp (opcional)</ThemedText>
        <TextInput
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="Sólo números, con código de país"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="WhatsApp"
          keyboardType="number-pad"
          maxLength={15}
          style={estiloCampo}
        />
      </View>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">Instagram (opcional)</ThemedText>
        <TextInput
          value={instagram}
          onChangeText={setInstagram}
          placeholder="@tucomercio"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Instagram"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={31}
          style={estiloCampo}
        />
      </View>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">Medios de pago</ThemedText>
        {MEDIOS_DE_PAGO.map((medio) => {
          const marcado = mediosDePago.includes(medio);
          return (
            <Pressable
              key={medio}
              onPress={() => alternarMedio(medio)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcado }}
              accessibilityLabel={ETIQUETA_MEDIO_DE_PAGO[medio]}
              style={[styles.filaMedio, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons
                name={marcado ? 'checkbox' : 'square-outline'}
                size={22}
                color={theme.text}
              />
              <ThemedText>{ETIQUETA_MEDIO_DE_PAGO[medio]}</ThemedText>
            </Pressable>
          );
        })}
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
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </ThemedText>
      </Pressable>
    </ScrollView>
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
  grupo: {
    gap: Spacing.two,
  },
  campo: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  campoLargo: {
    minHeight: 140,
    paddingVertical: Spacing.three,
  },
  filaMedio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
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
