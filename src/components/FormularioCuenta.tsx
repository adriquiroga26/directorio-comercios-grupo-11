import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErrorApi } from '@/servicios';
import { useSesion } from '@/sesion/SesionProvider';
import { validarCuenta } from '@/utilidades/cuenta';

type Modo = 'ingreso' | 'registro';

// Un solo formulario para las dos cosas: en "registro" pide además el nombre.
// El PRD: "no pidan cuenta para mirar", así que esta pantalla sólo aparece en
// la pestaña "Yo"; el resto de la app se puede usar sin ingresar.
export function FormularioCuenta() {
  const theme = useTheme();
  const { ingresar, registrarse } = useSesion();

  const [modo, setModo] = useState<Modo>('ingreso');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modo === 'registro';

  async function enviar() {
    // Primero se valida acá: así se avisa al instante, sin hacer un pedido que va a fallar.
    const problema = validarCuenta({ nombre, email, contrasena }, esRegistro);
    if (problema !== null) {
      setError(problema);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      if (esRegistro) {
        await registrarse(nombre, email, contrasena);
      } else {
        await ingresar(email, contrasena);
      }
      // Si salió bien, la sesión cambia y la pantalla "Yo" deja de mostrar este formulario.
    } catch (e) {
      // El mensaje de ErrorApi viene de la API y está listo para mostrar
      // (por ejemplo "El email o la contraseña no son correctos.").
      setError(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setEnviando(false);
    }
  }

  function cambiarModo() {
    setModo(esRegistro ? 'ingreso' : 'registro');
    setError(null);
  }

  const estiloCampo = [styles.campo, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.contenedor} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">{esRegistro ? 'Crear cuenta' : 'Ingresar'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            La cuenta hace falta para dejar reseñas, guardar favoritos y usar promos. Para mirar
            comercios no la necesitás.
          </ThemedText>

          {esRegistro && (
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Nombre"
              autoCapitalize="words"
              autoComplete="name"
              style={estiloCampo}
            />
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={estiloCampo}
          />

          <TextInput
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="Contraseña"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Contraseña"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={estiloCampo}
          />

          {error !== null && (
            <ThemedText type="small" style={styles.error} accessibilityRole="alert">
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={enviar}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityState={{ disabled: enviando }}
            style={[styles.botonPrincipal, { backgroundColor: theme.text, opacity: enviando ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {enviando ? 'Enviando…' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
            </ThemedText>
          </Pressable>

          <View style={styles.filaCambio}>
            <Pressable onPress={cambiarModo} accessibilityRole="button" hitSlop={8} style={styles.botonCambio}>
              <ThemedText type="small" themeColor="textSecondary">
                {esRegistro ? 'Ya tengo cuenta. Ingresar' : '¿No tenés cuenta? Creá una'}
              </ThemedText>
            </Pressable>
          </View>
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
    paddingBottom: BottomTabInset + Spacing.four,
  },
  campo: {
    height: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
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
  filaCambio: {
    alignItems: 'center',
  },
  botonCambio: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
