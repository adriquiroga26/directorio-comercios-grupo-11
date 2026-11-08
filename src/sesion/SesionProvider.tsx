import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  crearCuenta,
  iniciarSesion,
  obtenerMiCuenta,
  setAlVencerLaSesion,
  setToken,
} from '@/servicios';
import type { Sesion, Usuario } from '@/tipos';

import { borrarSesion, guardarSesion, guardarUsuario, leerSesion } from './almacen';

// 'cargando': todavía se está leyendo si hay una sesión guardada.
// 'bloqueada': hay una sesión guardada, pero falta desbloquearla con la huella
// o el rostro (o volver a ingresar). Pasa sólo al abrir la app.
type Estado = 'cargando' | 'sin-sesion' | 'bloqueada' | 'con-sesion';

interface ValorSesion {
  estado: Estado;
  usuario: Usuario | null;
  ingresar: (email: string, contrasena: string) => Promise<void>;
  registrarse: (nombre: string, email: string, contrasena: string) => Promise<void>;
  desbloquear: () => void;
  cerrarSesion: () => Promise<void>;
  // true si el usuario eligió "Ingresar con email y contraseña" en la pantalla de
  // bloqueo: las pestañas usan esto para abrir directo en "Yo", donde está el formulario.
  ingresoPedido: boolean;
  pedirIngreso: () => Promise<void>;
}

// Context: forma de que cualquier pantalla lea la sesión sin pasarla de padre a
// hijo por props. Arranca en null; el Provider le pone el valor real.
const SesionContext = createContext<ValorSesion | null>(null);

// Hook para usar la sesión desde una pantalla: const { usuario, ingresar } = useSesion();
export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (valor === null) throw new Error('useSesion tiene que usarse dentro de <SesionProvider>.');
  return valor;
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [ingresoPedido, setIngresoPedido] = useState(false);

  // Al abrir la app: leer la sesión guardada y, si hay, retomarla. Así la sesión
  // sobrevive al cierre de la app (lo pide la consigna) y funciona sin conexión.
  useEffect(() => {
    let cancelado = false;

    // La API avisa por acá que el token ya no vale: se cierra la sesión.
    // (Hace lo mismo que cerrarSesion, más abajo.)
    setAlVencerLaSesion(() => {
      setToken(null);
      setUsuario(null);
      setEstado('sin-sesion');
      void borrarSesion();
    });

    leerSesion().then((guardada) => {
      if (cancelado) return;
      if (guardada === null) {
        setEstado('sin-sesion');
        return;
      }

      // Hay sesión guardada: la app queda bloqueada hasta que el usuario se
      // identifique con la huella o el rostro (pantalla src/app/bloqueo.tsx).
      setToken(guardada.token);
      setUsuario(guardada.usuario);
      setEstado('bloqueada');

      // En segundo plano: comprobar que el token sigue valiendo y traer los datos
      // al día. Si venció, el cliente llama a alVencerLaSesion. Si no hay red, no
      // pasa nada: se sigue con lo guardado.
      obtenerMiCuenta()
        .then((actualizado) => {
          if (cancelado) return;
          setUsuario(actualizado);
          void guardarUsuario(actualizado);
        })
        .catch(() => {});
    });

    return () => {
      cancelado = true;
      setAlVencerLaSesion(null);
    };
  }, []);

  async function abrirSesion(sesion: Sesion) {
    setToken(sesion.token);
    setUsuario(sesion.usuario);
    setEstado('con-sesion');
    try {
      await guardarSesion(sesion);
    } catch {
      // Si el almacén falla (por ejemplo, en la versión web) la sesión sigue
      // abierta en memoria; sólo se pierde al cerrar la app.
    }
  }

  async function ingresar(email: string, contrasena: string) {
    const sesion = await iniciarSesion({ email: email.trim(), contrasena });
    await abrirSesion(sesion);
  }

  async function registrarse(nombre: string, email: string, contrasena: string) {
    const sesion = await crearCuenta({ nombre: nombre.trim(), email: email.trim(), contrasena });
    await abrirSesion(sesion);
  }

  // El usuario pasó la huella o el rostro: se abre la app con su sesión.
  // useCallback hace que la función sea siempre la misma entre renders; la
  // pantalla de bloqueo la usa dentro de un useEffect y, si cambiara, el efecto
  // volvería a correr y pediría la huella otra vez.
  const desbloquear = useCallback(() => {
    setEstado('con-sesion');
  }, []);

  const cerrarSesion = useCallback(async () => {
    setToken(null);
    setUsuario(null);
    setEstado('sin-sesion');
    await borrarSesion();
  }, []);

  // Alternativa a la huella: se cierra la sesión guardada y se anota que el usuario
  // quiere ingresar, para que la app abra directo en el formulario.
  const pedirIngreso = useCallback(async () => {
    setIngresoPedido(true);
    await cerrarSesion();
  }, [cerrarSesion]);

  return (
    <SesionContext.Provider
      value={{
        estado,
        usuario,
        ingresar,
        registrarse,
        desbloquear,
        cerrarSesion,
        ingresoPedido,
        pedirIngreso,
      }}>
      {children}
    </SesionContext.Provider>
  );
}
