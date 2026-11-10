import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  type AvisoProgramado,
  listarAvisosProgramados,
  ultimoErrorDeAvisos,
} from '@/avisos/notificaciones';
import { useAvisos } from '@/avisos/AvisosProvider';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDirectorio } from '@/directorio/DirectorioProvider';
import { useTheme } from '@/hooks/use-theme';
import { actualizarMisAvisos, type CambiosDeAvisos, ErrorApi } from '@/servicios';
import { useSesion } from '@/sesion/SesionProvider';

// La sección "Avisos" de la pestaña Yo (sólo cuentas de vecino): se pueden apagar todos los avisos de
// una, elegir los rubros de interés y permitir las notificaciones del teléfono. Lo que se elige se
// guarda en la cuenta (PATCH /yo): `avisosActivos` y `rubrosDeInteres`.
export function AvisosDeCuenta() {
  const theme = useTheme();
  const { usuario, actualizarUsuario } = useSesion();
  const { rubros } = useDirectorio();
  const { permiso, pedirPermiso } = useAvisos();

  const [guardando, setGuardando] = useState(false);
  // Sólo desarrollo: lo que hay programado en este momento (para comprobar sin esperar un día).
  const [programados, setProgramados] = useState<AvisoProgramado[]>([]);
  const [errorDeAvisos, setErrorDeAvisos] = useState<string | null>(null);

  const leerProgramados = useCallback(() => {
    if (!__DEV__) return;
    void listarAvisosProgramados()
      .then(setProgramados)
      .catch(() => {})
      // Pase lo que pase, se muestra el último problema que hayan dado las notificaciones.
      .finally(() => setErrorDeAvisos(ultimoErrorDeAvisos()));
  }, []);
  useFocusEffect(leerProgramados);

  if (usuario === null) return null;

  // Guarda un cambio en la cuenta y deja el usuario nuevo en la sesión. Hasta que la API responde,
  // los controles quedan desactivados.
  async function guardar(cambios: CambiosDeAvisos): Promise<boolean> {
    setGuardando(true);
    try {
      actualizarUsuario(await actualizarMisAvisos(cambios));
      return true;
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.',
      );
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function alternarAvisos(valor: boolean) {
    const guardado = await guardar({ avisosActivos: valor });
    // Al prender los avisos se pide el permiso del teléfono (si todavía no se dio).
    if (guardado && valor && permiso !== 'concedido') await pedirPermiso();
  }

  async function alternarRubro(rubroId: string) {
    const elegidos = usuario!.rubrosDeInteres;
    const nuevos = elegidos.includes(rubroId)
      ? elegidos.filter((id) => id !== rubroId)
      : [...elegidos, rubroId];
    await guardar({ rubrosDeInteres: nuevos });
    leerProgramados();
  }

  const sinPermiso = usuario.avisosActivos && permiso !== 'concedido';

  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">Avisos</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Te avisamos cuando aparece una promoción nueva de tus comercios favoritos o de tus rubros de
        interés, y un día antes de que venza.
      </ThemedText>

      <Pressable
        onPress={() => void alternarAvisos(!usuario.avisosActivos)}
        disabled={guardando}
        accessibilityRole="switch"
        accessibilityState={{ checked: usuario.avisosActivos, disabled: guardando }}
        accessibilityLabel="Recibir avisos de promociones"
        hitSlop={8}
        style={styles.filaSwitch}>
        {/* pointerEvents="none": el toque lo maneja el Pressable, así no se dispara dos veces. */}
        <Switch value={usuario.avisosActivos} pointerEvents="none" />
        <ThemedText type="small">Recibir avisos</ThemedText>
      </Pressable>

      {sinPermiso && (
        <View style={styles.aviso}>
          <ThemedText type="small">
            {permiso === 'bloqueado'
              ? 'Las notificaciones están desactivadas para esta app. Se activan desde los Ajustes del teléfono.'
              : 'Para recibir los avisos hace falta permitir las notificaciones del teléfono.'}
          </ThemedText>
          <Pressable
            onPress={() => void pedirPermiso()}
            accessibilityRole="button"
            hitSlop={8}
            style={[styles.boton, { backgroundColor: theme.text }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {permiso === 'bloqueado' ? 'Abrir Ajustes' : 'Permitir notificaciones'}
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ThemedText type="smallBold">Rubros de interés</ThemedText>
      <View style={styles.chips}>
        {rubros.map((rubro) => {
          const elegido = usuario.rubrosDeInteres.includes(rubro.id);
          return (
            <Pressable
              key={rubro.id}
              onPress={() => void alternarRubro(rubro.id)}
              disabled={guardando}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: elegido, disabled: guardando }}
              accessibilityLabel={rubro.nombre}
              hitSlop={6}
              style={[styles.chip, { backgroundColor: elegido ? theme.text : theme.backgroundSelected }]}>
              <ThemedText type="small" style={{ color: elegido ? theme.background : theme.text }}>
                {rubro.nombre}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {__DEV__ && (
        <View style={styles.dev}>
          <ThemedText type="small" themeColor="textSecondary">
            Sólo desarrollo · avisos programados: {programados.length}
          </ThemedText>
          {programados.map((aviso) => (
            <ThemedText key={aviso.id} type="small" themeColor="textSecondary">
              · {aviso.titulo}
            </ThemedText>
          ))}
          <ThemedText type="small" themeColor="textSecondary">
            Permiso: {permiso} · último error: {errorDeAvisos ?? 'ninguno'}
          </ThemedText>
          <Pressable onPress={leerProgramados} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="small">Actualizar</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
  },
  aviso: {
    gap: Spacing.two,
  },
  boton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    minHeight: 32,
    justifyContent: 'center',
  },
  dev: {
    gap: Spacing.half,
    marginTop: Spacing.two,
  },
});
