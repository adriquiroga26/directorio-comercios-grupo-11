import { useNetworkState } from 'expo-network';
import { Linking, AppState } from 'react-native';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useDirectorio } from '@/directorio/DirectorioProvider';
import { useSesion } from '@/sesion/SesionProvider';

import {
  anotarError,
  leerPermisoDeAvisos,
  pedirPermisoDeAvisos,
  type PermisoAvisos,
} from './notificaciones';
import { quitarAvisosProgramados, sincronizarAvisos } from './sincronizar';

// Los avisos de "promo por vencer". Este proveedor hace dos cosas:
//  1. Sabe si el teléfono dejó mostrar notificaciones (el permiso) y deja pedirlo.
//  2. Mantiene al día los avisos programados: cada vez que pasa algo que los puede cambiar (se abre
//     la sesión, se marca o quita un favorito, se cambian los rubros de interés, se prenden o apagan
//     los avisos, vuelve internet), vuelve a calcular qué avisos corresponden.
// Los avisos son sólo para cuentas de vecino.

interface ValorAvisos {
  permiso: PermisoAvisos;
  // Pregunta por el permiso (o lleva a los Ajustes si está bloqueado) y actualiza `permiso`.
  pedirPermiso: () => Promise<void>;
}

const AvisosContext = createContext<ValorAvisos | null>(null);

// Si nada cambió desde la última vez y fue hace menos de 5 minutos, no se vuelve a pedir las
// promociones a la API: el directorio se recarga seguido y no hace falta consultar cada vez.
const VIDA_DE_LA_CONSULTA_MS = 5 * 60 * 1000;
let ultimaFirma = '';
let ultimaConsultaEn = 0;
// La última cuenta de vecino que tuvo la sesión abierta: al cerrarla ya no hay `usuario`, pero hace
// falta saber de quién eran los avisos que se sacan.
let ultimoUsuarioId: string | null = null;

export function AvisosProvider({ children }: { children: ReactNode }) {
  const { estado, usuario } = useSesion();
  const { comercios } = useDirectorio();

  const [permiso, setPermiso] = useState<PermisoAvisos>('sin-pedir');
  // Hasta que no se lee el permiso por primera vez, `permiso` es sólo el valor de arranque: no se
  // puede decidir nada con él (si no, se sacarían los avisos programados antes de saber si hay permiso).
  const [permisoLeido, setPermisoLeido] = useState(false);

  // El permiso se mira al abrir la app y cada vez que vuelve al primer plano (por ejemplo, después
  // de activarlo en los Ajustes). Se cambia el estado cuando llega la respuesta, no en el efecto.
  useEffect(() => {
    const mirar = () => {
      void leerPermisoDeAvisos()
        .then((leido) => {
          setPermiso(leido);
          setPermisoLeido(true);
        })
        .catch(() => {});
    };
    mirar();
    const suscripcion = AppState.addEventListener('change', (actual) => {
      if (actual === 'active') mirar();
    });
    return () => suscripcion.remove();
  }, []);

  const pedirPermiso = useCallback(async () => {
    if (permiso === 'bloqueado') {
      await Linking.openSettings();
      return;
    }
    try {
      setPermiso(await pedirPermisoDeAvisos());
    } catch {
      // Si el sistema no pudo mostrar el pedido, el permiso queda como estaba (el motivo se
      // anota en notificaciones.ts) y la app sigue andando.
    }
  }, [permiso]);

  // Datos simples (texto y números) para usar como dependencias del efecto: el objeto `usuario` es
  // otro cada vez que se actualiza, y el efecto no tiene que correr por eso.
  const esVecino = usuario?.rol === 'vecino';
  const usuarioId = usuario?.id ?? null;
  const avisosActivos = usuario?.avisosActivos ?? false;
  const favoritosClave = (usuario?.favoritos ?? []).join(',');
  const rubrosClave = (usuario?.rubrosDeInteres ?? []).join(',');
  const red = useNetworkState();
  const hayInternet = red.isInternetReachable ?? red.isConnected ?? true;

  useEffect(() => {
    // Al cerrar la sesión no tienen que seguir llegando los avisos de esa cuenta.
    if (estado === 'sin-sesion') {
      ultimaFirma = '';
      void quitarAvisosProgramados(ultimoUsuarioId).catch(() => {});
      return;
    }
    if (estado !== 'con-sesion' || usuario === null || !esVecino) return;
    ultimoUsuarioId = usuarioId;

    // Todavía no se sabe si hay permiso: no se decide nada (ni se saca ni se programa).
    if (!permisoLeido) return;

    // Con los avisos apagados, o sin permiso del teléfono, no se programa nada y se saca lo que hubiera.
    if (!avisosActivos || permiso !== 'concedido') {
      ultimaFirma = '';
      void quitarAvisosProgramados(usuarioId).catch(() => {});
      return;
    }
    // Sin conexión no se pueden pedir las promociones: lo ya programado queda como está.
    if (!hayInternet || comercios.length === 0) return;

    const firma = [usuarioId, favoritosClave, rubrosClave, permiso].join('|');
    const yaConsultado = firma === ultimaFirma && Date.now() - ultimaConsultaEn < VIDA_DE_LA_CONSULTA_MS;
    if (yaConsultado) return;
    ultimaFirma = firma;
    ultimaConsultaEn = Date.now();

    void sincronizarAvisos(usuario, comercios).catch((error) => {
      // Si falla (por ejemplo, la API no responde), se vuelve a intentar la próxima vez. El motivo
      // queda anotado para la pantalla de desarrollo.
      anotarError('sincronizar los avisos', error);
      ultimaFirma = '';
    });
    // `usuario` no va en la lista a propósito: lo que importa de él son los datos de arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    estado,
    usuarioId,
    esVecino,
    avisosActivos,
    favoritosClave,
    rubrosClave,
    permiso,
    permisoLeido,
    hayInternet,
    comercios,
  ]);

  return <AvisosContext.Provider value={{ permiso, pedirPermiso }}>{children}</AvisosContext.Provider>;
}

export function useAvisos(): ValorAvisos {
  const valor = useContext(AvisosContext);
  if (valor === null) throw new Error('useAvisos tiene que usarse dentro de un AvisosProvider.');
  return valor;
}
