import * as LocalAuthentication from 'expo-local-authentication';

// Biometría (huella o rostro) con expo-local-authentication.
//   'ok'            → el usuario se identificó.
//   'sin-biometria' → el teléfono no tiene lector, o no tiene ninguna huella o rostro
//                     registrados. No se puede pedir: hay que ofrecer la alternativa.
//   'rechazada'     → canceló, la huella no coincidió o hubo un error.
export type ResultadoBiometria = 'ok' | 'sin-biometria' | 'rechazada';

// Se pregunta SIEMPRE antes de pedir la huella: no todos los teléfonos tienen
// lector, y uno que lo tiene puede no tener nada registrado. La pantalla de
// bloqueo ofrece como alternativa volver a ingresar con email y contraseña.
// Esta función no cambia ningún estado: sólo devuelve el resultado.
export async function pedirDesbloqueo(): Promise<ResultadoBiometria> {
  const hayLector = await LocalAuthentication.hasHardwareAsync();
  const hayHuellas = hayLector && (await LocalAuthentication.isEnrolledAsync());
  if (!hayHuellas) return 'sin-biometria';

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirmá tu identidad',
    cancelLabel: 'Cancelar',
  });
  return resultado.success ? 'ok' : 'rechazada';
}
