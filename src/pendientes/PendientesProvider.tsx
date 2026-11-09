import { useNetworkState } from 'expo-network';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';

import {
  descartarPendiente,
  enviarPendientes,
  listarPendientes,
  type ResumenDeEnvio,
} from '@/servicios';
import { useSesion } from '@/sesion/SesionProvider';
import type { ResenaPendiente } from '@/tipos';

// Las reseñas que la persona escribió sin conexión y todavía no llegaron a la API. Las pantallas
// leen la lista (para mostrarlas como "pendientes") y este proveedor se ocupa de enviarlas solas
// cuando hay conexión y la sesión está abierta.

interface ValorPendientes {
  pendientes: ResenaPendiente[];
  // Vuelve a leer la cola (por ejemplo, después de guardar una reseña nueva).
  recargar: () => Promise<void>;
  // Saca una reseña de la cola (la persona decide no enviarla, o ya vio por qué la rechazaron).
  descartar: (id: string) => Promise<void>;
  // Intenta enviar ahora las pendientes (si hay sesión abierta).
  sincronizar: () => Promise<void>;
}

const PendientesContext = createContext<ValorPendientes | null>(null);

export function PendientesProvider({ children }: { children: ReactNode }) {
  const { estado, usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;

  const [pendientes, setPendientes] = useState<ResenaPendiente[]>([]);

  const recargar = useCallback(async () => {
    if (usuarioId === null) {
      setPendientes([]);
      return;
    }
    try {
      setPendientes(await listarPendientes(usuarioId));
    } catch {
      // Si la base falla, la lista queda como estaba.
    }
  }, [usuarioId]);

  // Se lee la cola al abrirse la sesión o al cambiar de cuenta. El estado se cambia recién
  // cuando llega la respuesta (en el .then), no dentro del efecto.
  useEffect(() => {
    if (usuarioId === null) return;
    void listarPendientes(usuarioId)
      .then(setPendientes)
      .catch(() => {});
  }, [usuarioId]);

  // Después de un intento de envío: si algo cambió, se actualiza la lista y se avisa.
  const mostrarResumen = useCallback(async (id: string, resumen: ResumenDeEnvio) => {
    if (resumen.enviadas === 0 && resumen.rechazadas === 0) return;
    setPendientes(await listarPendientes(id));
    if (resumen.enviadas > 0) {
      Alert.alert(
        'Reseñas enviadas',
        resumen.enviadas === 1
          ? 'Tu reseña, que habías escrito sin conexión, ya se envió.'
          : `Tus ${resumen.enviadas} reseñas, que habías escrito sin conexión, ya se enviaron.`,
      );
    }
  }, []);

  // Se envían las pendientes cuando hay sesión abierta (no bloqueada) Y conexión: al abrir la
  // app, al iniciar sesión y cada vez que vuelve internet. El estado se cambia recién cuando
  // llega la respuesta (en el .then), no dentro del efecto.
  const red = useNetworkState();
  const hayInternet = red.isInternetReachable ?? red.isConnected ?? true;
  useEffect(() => {
    if (estado !== 'con-sesion' || usuarioId === null || !hayInternet) return;

    void enviarPendientes(usuarioId)
      .then((resumen) => mostrarResumen(usuarioId, resumen))
      .catch(() => {});
  }, [estado, usuarioId, hayInternet, mostrarResumen]);

  // El mismo intento, pero a pedido de una pantalla (por ejemplo, al abrir la ficha de un
  // comercio con una reseña pendiente). Sirve cuando la conexión "vuelve" sin que la red cambie,
  // como cuando se reinicia el servidor de la API.
  const sincronizar = useCallback(async () => {
    if (estado !== 'con-sesion' || usuarioId === null) return;
    try {
      await mostrarResumen(usuarioId, await enviarPendientes(usuarioId));
    } catch {
      // Si falla, se reintenta la próxima vez.
    }
  }, [estado, usuarioId, mostrarResumen]);

  const descartar = useCallback(
    async (id: string) => {
      await descartarPendiente(id);
      await recargar();
    },
    [recargar],
  );

  // Al cerrar sesión no se muestra la cola de la cuenta anterior.
  const visibles = usuarioId === null ? [] : pendientes;

  return (
    <PendientesContext.Provider value={{ pendientes: visibles, recargar, descartar, sincronizar }}>
      {children}
    </PendientesContext.Provider>
  );
}

export function usePendientes(): ValorPendientes {
  const valor = useContext(PendientesContext);
  if (valor === null) {
    throw new Error('usePendientes tiene que usarse dentro de un PendientesProvider.');
  }
  return valor;
}
