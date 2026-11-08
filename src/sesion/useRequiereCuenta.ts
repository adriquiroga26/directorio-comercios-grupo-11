import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useSesion } from './SesionProvider';

// El PRD: "no pidan cuenta para mirar; la cuenta hace falta para dejar reseñas,
// guardar favoritos y usar promos". Este hook devuelve una función que ejecuta una
// acción sólo si hay una sesión abierta. Si no la hay, muestra un cartel que explica
// por qué y ofrece ir a la pestaña Yo a ingresar.
//
// Uso:  const requerirCuenta = useRequiereCuenta();
//       <Pressable onPress={() => requerirCuenta(() => guardarFavorito())} />
export function useRequiereCuenta() {
  const { estado } = useSesion();
  const router = useRouter();

  return function requerirCuenta(accion: () => void) {
    if (estado === 'con-sesion') {
      accion();
      return;
    }

    Alert.alert('Necesitás una cuenta', 'Para hacer esto tenés que ingresar o crear una cuenta.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ingresar', onPress: () => router.navigate('/yo') },
    ]);
  };
}
