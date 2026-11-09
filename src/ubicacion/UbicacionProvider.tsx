import * as Location from 'expo-location';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import type { Coordenadas } from '@/tipos';

// Dónde está la persona. La ubicación es OPCIONAL: el PRD pide que, si la niega, la app siga
// sirviendo para buscar por nombre y por rubro. Por eso este estado no bloquea nada: sólo
// dice si hay una posición para mostrar distancias y ubicar a la persona en el mapa.
//
//   sin-pedir  todavía no se le preguntó (el sistema no tiene respuesta)
//   buscando   hay permiso y se está esperando la posición
//   lista      hay posición
//   denegada   dijo que no, pero el sistema todavía deja volver a preguntar
//   bloqueada  dijo que no y ya no se puede preguntar: sólo se cambia desde los Ajustes
//   error      hay permiso pero no se consiguió la posición (por ejemplo, GPS apagado)
export type EstadoUbicacion = 'sin-pedir' | 'buscando' | 'lista' | 'denegada' | 'bloqueada' | 'error';

interface ValorUbicacion {
  estado: EstadoUbicacion;
  posicion: Coordenadas | null;
  // Pregunta por el permiso (o abre los Ajustes si está bloqueado) y busca la posición.
  pedirUbicacion: () => Promise<void>;
  // Vuelve a buscar la posición, pero sólo si la última tiene más de un minuto.
  actualizarSiHaceFalta: () => Promise<void>;
  // SÓLO PARA DESARROLLO: pone una posición falsa (o vuelve al GPS real con null). Sirve para
  // probar las distancias sin estar en la ciudad de los comercios.
  simularPosicion: (posicion: Coordenadas | null) => void;
}

const UbicacionContext = createContext<ValorUbicacion | null>(null);

// Sin tiempo máximo, un GPS que no responde dejaría el estado en "buscando" para siempre.
const TIEMPO_MAXIMO_MS = 15_000;
const VIDA_DE_LA_POSICION_MS = 60_000;

function conTiempoMaximo<T>(promesa: Promise<T>): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const temporizador = setTimeout(() => rechazar(new Error('Tiempo agotado')), TIEMPO_MAXIMO_MS);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(temporizador);
        rechazar(error);
      },
    );
  });
}

// Traduce la respuesta del sistema sobre el permiso a un estado de la app.
function estadoDelPermiso(permiso: Location.LocationPermissionResponse): EstadoUbicacion | 'concedido' {
  if (permiso.granted) return 'concedido';
  if (permiso.status === Location.PermissionStatus.UNDETERMINED) return 'sin-pedir';
  return permiso.canAskAgain ? 'denegada' : 'bloqueada';
}

export function UbicacionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoUbicacion>('sin-pedir');
  const [posicion, setPosicion] = useState<Coordenadas | null>(null);
  // Cuándo se consiguió la última posición. Es un dato que no se dibuja: va en un ref.
  const ultimaPosicionEn = useRef(0);
  // Mientras hay una posición simulada (sólo en desarrollo), el GPS real no la pisa.
  const simulada = useRef(false);

  // Pide la posición actual. Si ya había una, no vuelve a "buscando": la tarjeta de aviso no
  // tiene por qué parpadear cada vez que se refresca.
  const buscar = useCallback(async () => {
    if (simulada.current) return;
    setEstado((anterior) => (anterior === 'lista' ? anterior : 'buscando'));
    try {
      const actual = await conTiempoMaximo(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      );
      setPosicion({ latitud: actual.coords.latitude, longitud: actual.coords.longitude });
      ultimaPosicionEn.current = Date.now();
      setEstado('lista');
    } catch {
      setEstado((anterior) => (anterior === 'lista' ? anterior : 'error'));
    }
  }, []);

  // Al abrir la app, y cada vez que vuelve al primer plano (por ejemplo, después de activar el
  // permiso en los Ajustes): se MIRA el permiso sin molestar con el cartel del sistema.
  useEffect(() => {
    let activo = true;

    async function revisar() {
      const permiso = await Location.getForegroundPermissionsAsync();
      if (!activo) return;
      const nuevo = estadoDelPermiso(permiso);
      if (nuevo === 'concedido') {
        await buscar();
      } else {
        setEstado(nuevo);
      }
    }

    void revisar();
    const suscripcion = AppState.addEventListener('change', (actual) => {
      if (actual === 'active') void revisar();
    });
    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, [buscar]);

  async function pedirUbicacion() {
    // Con el permiso bloqueado el sistema ya no muestra el cartel: sólo queda llevar a la
    // persona a los Ajustes del teléfono.
    if (estado === 'bloqueada') {
      await Linking.openSettings();
      return;
    }
    const permiso = await Location.requestForegroundPermissionsAsync();
    const nuevo = estadoDelPermiso(permiso);
    if (nuevo === 'concedido') {
      await buscar();
    } else {
      setEstado(nuevo);
    }
  }

  // Sólo refresca si ya hubo una posición (0 = nunca la hubo) y quedó vieja. Va con
  // useCallback para que su identidad no cambie en cada dibujo: las pantallas la usan como
  // dependencia de un efecto.
  const actualizarSiHaceFalta = useCallback(async () => {
    if (ultimaPosicionEn.current === 0) return;
    if (Date.now() - ultimaPosicionEn.current < VIDA_DE_LA_POSICION_MS) return;
    await buscar();
  }, [buscar]);

  function simularPosicion(falsa: Coordenadas | null) {
    if (!__DEV__) return;
    if (falsa === null) {
      // Se vuelve al GPS real: se vuelve a pedir (si falta el permiso, se pregunta).
      simulada.current = false;
      void pedirUbicacion();
      return;
    }
    simulada.current = true;
    setPosicion(falsa);
    ultimaPosicionEn.current = Date.now();
    setEstado('lista');
  }

  return (
    <UbicacionContext.Provider
      value={{ estado, posicion, pedirUbicacion, actualizarSiHaceFalta, simularPosicion }}>
      {children}
    </UbicacionContext.Provider>
  );
}

export function useUbicacion(): ValorUbicacion {
  const valor = useContext(UbicacionContext);
  if (valor === null) {
    throw new Error('useUbicacion tiene que usarse dentro de un UbicacionProvider.');
  }
  return valor;
}
