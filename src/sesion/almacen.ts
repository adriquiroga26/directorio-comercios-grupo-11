import * as SecureStore from 'expo-secure-store';

import type { Sesion, Usuario } from '@/tipos';

// La sesión se guarda en expo-secure-store (Keystore en Android, Keychain en iOS),
// NUNCA en kv-store: si alguien lee el token, puede hacerse pasar por el usuario.
// SecureStore sólo guarda texto, así que el usuario se guarda como JSON.
// Las claves sólo pueden tener letras, números, ".", "-" y "_".
const CLAVE_TOKEN = 'sesion.token';
const CLAVE_USUARIO = 'sesion.usuario';

export async function guardarSesion(sesion: Sesion): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, sesion.token);
  await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
}

// Actualiza sólo el usuario (por ejemplo, después de refrescarlo desde la API).
export async function guardarUsuario(usuario: Usuario): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario));
}

// null si no hay sesión guardada o si lo guardado no se puede leer.
export async function leerSesion(): Promise<Sesion | null> {
  try {
    const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
    const usuarioTexto = await SecureStore.getItemAsync(CLAVE_USUARIO);
    if (!token || !usuarioTexto) return null;
    return { token, usuario: JSON.parse(usuarioTexto) as Usuario };
  } catch {
    return null;
  }
}

export async function borrarSesion(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
    await SecureStore.deleteItemAsync(CLAVE_USUARIO);
  } catch {
    // Si no se pudo borrar no hay nada más que hacer: la sesión ya se cerró en memoria.
  }
}
