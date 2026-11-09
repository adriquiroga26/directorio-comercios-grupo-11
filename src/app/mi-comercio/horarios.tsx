import Ionicons from '@react-native-vector-icons/ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectorDia } from '@/components/SelectorDia';
import { SelectorHora } from '@/components/SelectorHora';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { editarMiComercio, ErrorApi, obtenerMiComercio } from '@/servicios';
import type { Comercio, Horario } from '@/tipos';
import { mismosHorarios, validarCierre, validarHorarios } from '@/utilidades/edicionHorarios';
import { claveDelDia } from '@/utilidades/fechas';
import { NOMBRES_DIA } from '@/utilidades/horarios';

type Estado = 'cargando' | 'error' | 'listo';

// De lunes a domingo, como se muestra en la ficha (el 0 de la API es el domingo).
const DIAS_EN_ORDEN: Horario['dia'][] = [1, 2, 3, 4, 5, 6, 0];

// Un tramo de la lista que se está editando: lleva una `clave` propia (un número que no
// cambia) para que React no confunda un tramo con otro cuando se quita uno del medio.
interface Tramo extends Horario {
  clave: number;
}

function nombreConMayuscula(dia: Horario['dia']): string {
  const nombre = NOMBRES_DIA[dia];
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

// Dentro de 7 días: el último día de cierre que se propone.
function dentroDeUnaSemana(): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  return fecha;
}

// Horarios de atención y cierre por vacaciones del comercio. Cada sección se guarda por
// separado y manda SOLO lo suyo. Esta ruta sólo existe para cuentas de comercio
// (Stack.Protected en el layout raíz).
export default function HorariosScreen() {
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
      <Stack.Screen options={{ headerShown: true, title: 'Horarios y vacaciones' }} />
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

        {estado === 'listo' && comercio !== null && <Formulario comercio={comercio} />}
      </SafeAreaView>
    </ThemedView>
  );
}

// Va aparte para que los tramos arranquen con lo guardado (useState toma el valor inicial
// una sola vez, así que se arma cuando el comercio ya llegó).
function Formulario({ comercio }: { comercio: Comercio }) {
  const theme = useTheme();
  const router = useRouter();

  // Contador para darle una clave nueva a cada tramo que se agrega.
  const proximaClave = useRef(comercio.horarios.length);
  const [tramos, setTramos] = useState<Tramo[]>(() =>
    comercio.horarios.map((horario, i) => ({ ...horario, clave: i })),
  );
  const [errorHorarios, setErrorHorarios] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [ultimoDia, setUltimoDia] = useState(dentroDeUnaSemana);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);

  // Sin tramos puede ser que no haya horarios cargados... o que el comercio esté cerrado por
  // vacaciones (mientras dura, la API los devuelve vacíos aunque estén guardados).
  const sinHorarios = comercio.horarios.length === 0;

  function agregarTramo(dia: Horario['dia']) {
    const clave = proximaClave.current++;
    setTramos((actuales) => [...actuales, { clave, dia, abre: '09:00', cierra: '13:00' }]);
  }

  function quitarTramo(clave: number) {
    setTramos((actuales) => actuales.filter((t) => t.clave !== clave));
  }

  function cambiarTramo(clave: number, cambios: Partial<Horario>) {
    setTramos((actuales) => actuales.map((t) => (t.clave === clave ? { ...t, ...cambios } : t)));
  }

  // Manda a la API la lista entera y vuelve al panel.
  async function enviarHorarios(horarios: Horario[]) {
    setGuardando(true);
    try {
      await editarMiComercio({ horarios });
      router.back();
    } catch (e) {
      setErrorHorarios(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  function guardarHorarios() {
    // Se quita la `clave`: es sólo de la pantalla, la API no la conoce.
    const horarios: Horario[] = tramos.map(({ dia, abre, cierra }) => ({ dia, abre, cierra }));

    const problema = validarHorarios(horarios);
    if (problema !== null) {
      setErrorHorarios(problema);
      return;
    }
    if (mismosHorarios(horarios, comercio.horarios)) {
      setErrorHorarios('No hay cambios para guardar.');
      return;
    }

    setErrorHorarios(null);

    // La API REEMPLAZA los horarios guardados por esta lista. Si llegó vacía puede que haya
    // horarios guardados que no se ven por las vacaciones: se avisa antes de pisarlos.
    if (sinHorarios) {
      Alert.alert(
        'Guardar horarios',
        'Ahora no se ven horarios cargados. Si tu comercio está cerrado por vacaciones, los que tenías vuelven a verse cuando termine el cierre, y si guardás estos los reemplazan. ¿Seguir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar', onPress: () => void enviarHorarios(horarios) },
        ],
      );
      return;
    }
    void enviarHorarios(horarios);
  }

  // Manda sólo `cerradoHasta`: no toca los horarios. `null` levanta el cierre.
  async function enviarCierre(cerradoHasta: string | null) {
    setErrorCierre(null);
    setCerrando(true);
    try {
      await editarMiComercio({ cerradoHasta });
      Alert.alert(
        cerradoHasta === null ? 'Cierre levantado' : 'Comercio cerrado por vacaciones',
        cerradoHasta === null
          ? 'Tus horarios vuelven a verse.'
          : 'Los vecinos lo ven cerrado hasta esa fecha. Después vuelven tus horarios solos.',
      );
      router.back();
    } catch (e) {
      setErrorCierre(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setCerrando(false);
    }
  }

  function cerrarPorVacaciones() {
    const problema = validarCierre(ultimoDia);
    if (problema !== null) {
      setErrorCierre(problema);
      return;
    }
    // La API quiere el día como "AAAA-MM-DD".
    void enviarCierre(claveDelDia(ultimoDia));
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <ThemedText type="smallBold">Horarios de atención</ThemedText>

      {sinHorarios && (
        <View style={[styles.aviso, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.text} />
          <ThemedText type="small" style={styles.textoAviso}>
            No hay horarios para mostrar. Puede ser que todavía no cargaste ninguno, o que el
            comercio esté cerrado por vacaciones.
          </ThemedText>
        </View>
      )}

      {DIAS_EN_ORDEN.map((dia) => {
        const delDia = tramos.filter((t) => t.dia === dia);
        return (
          <View key={dia} style={[styles.tarjetaDia, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.filaDia}>
              <ThemedText type="smallBold">{nombreConMayuscula(dia)}</ThemedText>
              <Pressable
                onPress={() => agregarTramo(dia)}
                accessibilityRole="button"
                accessibilityLabel={`Agregar un tramo el ${NOMBRES_DIA[dia]}`}
                hitSlop={8}
                style={styles.accion}>
                <ThemedText type="smallBold">+ Agregar tramo</ThemedText>
              </Pressable>
            </View>

            {delDia.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Cerrado
              </ThemedText>
            )}

            {delDia.map((tramo) => (
              <View key={tramo.clave} style={styles.filaTramo}>
                <SelectorHora
                  etiqueta="Abre"
                  valor={tramo.abre}
                  onCambio={(hora) => cambiarTramo(tramo.clave, { abre: hora })}
                />
                <SelectorHora
                  etiqueta="Cierra"
                  valor={tramo.cierra}
                  onCambio={(hora) => cambiarTramo(tramo.clave, { cierra: hora })}
                />
                <Pressable
                  onPress={() => quitarTramo(tramo.clave)}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar el tramo de ${tramo.abre} a ${tramo.cierra} del ${NOMBRES_DIA[dia]}`}
                  hitSlop={8}
                  style={styles.botonQuitar}>
                  <Ionicons name="trash-outline" size={20} color={theme.text} />
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}

      <ThemedText type="small" themeColor="textSecondary">
        Un horario que pasa la medianoche (por ejemplo, de 22:00 a 02:00) se carga como dos
        tramos: hasta las 23:59 de un día y desde las 00:00 del siguiente.
      </ThemedText>

      {errorHorarios !== null && (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {errorHorarios}
        </ThemedText>
      )}

      <Pressable
        onPress={guardarHorarios}
        disabled={guardando}
        accessibilityRole="button"
        accessibilityState={{ disabled: guardando }}
        style={[styles.botonPrincipal, { backgroundColor: theme.text, opacity: guardando ? 0.6 : 1 }]}>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {guardando ? 'Guardando…' : 'Guardar horarios'}
        </ThemedText>
      </Pressable>

      <View style={[styles.separador, { backgroundColor: theme.backgroundElement }]} />

      <ThemedText type="smallBold">Cierre por vacaciones</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Mientras dure, los vecinos ven tu comercio cerrado. Después tus horarios vuelven solos.
        Elegí el último día en que vas a estar cerrado.
      </ThemedText>

      <SelectorDia etiqueta="Cerrado hasta (inclusive)" valor={ultimoDia} onCambio={setUltimoDia} />

      {errorCierre !== null && (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {errorCierre}
        </ThemedText>
      )}

      <Pressable
        onPress={cerrarPorVacaciones}
        disabled={cerrando}
        accessibilityRole="button"
        accessibilityState={{ disabled: cerrando }}
        style={[styles.botonPrincipal, { backgroundColor: theme.text, opacity: cerrando ? 0.6 : 1 }]}>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {cerrando ? 'Guardando…' : 'Cerrar por vacaciones'}
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => void enviarCierre(null)}
        disabled={cerrando}
        accessibilityRole="button"
        accessibilityState={{ disabled: cerrando }}
        style={[styles.botonSecundario, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">Levantar el cierre</ThemedText>
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
  aviso: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  textoAviso: {
    flex: 1,
  },
  tarjetaDia: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  filaDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accion: {
    minHeight: 40,
    justifyContent: 'center',
  },
  filaTramo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  botonQuitar: {
    minWidth: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
  botonSecundario: {
    minHeight: 48,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: {
    height: 2,
    marginVertical: Spacing.two,
  },
});
