import Ionicons from '@react-native-vector-icons/ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pedirDesbloqueo, type ResultadoBiometria } from '@/sesion/biometria';
import { useSesion } from '@/sesion/SesionProvider';

// Pantalla de bloqueo: aparece al abrir la app cuando hay una sesión guardada.
// No hace falta volver a escribir la contraseña: se confirma con la huella o el
// rostro y se entra. Si el teléfono no tiene biometría (o falla), la alternativa
// es ingresar de nuevo con email y contraseña.
export default function BloqueoScreen() {
  const theme = useTheme();
  const { usuario, desbloquear, pedirIngreso } = useSesion();

  const [mensaje, setMensaje] = useState<string | null>(null);
  // null = todavía no se sabe si el teléfono tiene biometría.
  const [hayBiometria, setHayBiometria] = useState<boolean | null>(null);

  // Qué hace la pantalla con lo que respondió la biometría.
  const aplicar = useCallback(
    (resultado: ResultadoBiometria) => {
      setHayBiometria(resultado !== 'sin-biometria');
      if (resultado === 'ok') {
        desbloquear();
      } else if (resultado === 'sin-biometria') {
        setMensaje(
          'Este teléfono no tiene huella ni rostro registrados. Ingresá con tu email y contraseña.',
        );
      } else {
        setMensaje('No pudimos confirmar tu identidad. Probá de nuevo o ingresá con tu contraseña.');
      }
    },
    [desbloquear],
  );

  // Al abrir la pantalla se pide la huella sola, sin que el usuario toque nada.
  // `cancelado` evita aplicar el resultado si la pantalla ya se cerró.
  useEffect(() => {
    let cancelado = false;
    pedirDesbloqueo().then((resultado) => {
      if (!cancelado) aplicar(resultado);
    });
    return () => {
      cancelado = true;
    };
  }, [aplicar]);

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.contenido}>
        <Ionicons name="lock-closed-outline" size={48} color={theme.text} />
        <ThemedText type="subtitle" style={styles.centrado}>
          Hola, {usuario?.nombre ?? ''}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centrado}>
          Confirmá tu identidad para entrar a tu cuenta.
        </ThemedText>

        {mensaje !== null && (
          <ThemedText type="small" style={[styles.centrado, styles.mensaje]} accessibilityRole="alert">
            {mensaje}
          </ThemedText>
        )}

        {hayBiometria !== false && (
          <Pressable
            onPress={() => {
              // Al reintentar se borra el aviso anterior y se vuelve a pedir la huella.
              setMensaje(null);
              pedirDesbloqueo().then(aplicar);
            }}
            accessibilityRole="button"
            style={[styles.botonPrincipal, { backgroundColor: theme.text }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Usar huella o rostro
            </ThemedText>
          </Pressable>
        )}

        {/* Alternativa: cierra la sesión guardada y abre la app directo en la
            pestaña "Yo", con el formulario de ingreso. */}
        <Pressable
          onPress={pedirIngreso}
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.botonSecundario, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Ingresar con email y contraseña</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  contenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centrado: {
    textAlign: 'center',
  },
  mensaje: {
    color: '#C0392B',
  },
  botonPrincipal: {
    minHeight: 48,
    minWidth: 240,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundario: {
    minHeight: 48,
    minWidth: 240,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
