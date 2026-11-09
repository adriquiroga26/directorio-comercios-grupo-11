import { useNetworkState } from 'expo-network';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cargarDirectorio, type Directorio, ErrorApi } from '@/servicios';
import type { Comercio, Rubro } from '@/tipos';

// El directorio de comercios (con sus rubros) que comparten Buscar, Mapa, Promos y Favoritos.
// Se carga una sola vez para toda la app, en lugar de que cada pestaña lo pida por su cuenta, y
// se actualiza cuando hace falta. La regla de "API primero, teléfono de respaldo" está en el
// servicio `cargarDirectorio`; acá sólo se guarda el resultado para que las pantallas lo lean.

type Estado = 'cargando' | 'error' | 'listo';

interface ValorDirectorio {
  estado: Estado;
  comercios: Comercio[];
  rubros: Rubro[];
  // true si no se pudo actualizar y lo que se ve es lo guardado en el teléfono.
  desdeGuardado: boolean;
  // Cuándo se bajaron estos datos de la API (fecha ISO), o null si no se sabe.
  actualizadoEn: string | null;
  mensajeError: string;
  // Vuelve a pedir los datos sin que la pantalla pase por "cargando". Si se actualizaron hace
  // menos de 30 segundos no hace nada (cada vez que se vuelve a una pestaña se la llama).
  recargar: () => Promise<void>;
  // Para el botón "Reintentar": muestra "cargando" y vuelve a pedir los datos sí o sí.
  reintentar: () => void;
}

// Lo que devuelve un pedido: los datos, o el mensaje de error (sólo si no había nada guardado).
type Resultado =
  | { tipo: 'ok'; directorio: Directorio }
  | { tipo: 'error'; mensaje: string };

const DirectorioContext = createContext<ValorDirectorio | null>(null);

const VIDA_DE_LOS_DATOS_MS = 30_000;

export function DirectorioProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [desdeGuardado, setDesdeGuardado] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState('');

  // Datos que no se dibujan van en refs: la última vez que se bajaron de la API y si hay un
  // pedido en camino (para no mandar dos iguales a la vez).
  const ultimaCargaOk = useRef(0);
  const enCurso = useRef(false);

  // PIDE los datos pero no toca el estado de la pantalla: devuelve el resultado y quien llama
  // lo aplica. Devuelve null si no hacía falta pedir. Un pedido "forzado" siempre se hace; uno
  // común se saltea si ya hay otro en camino o si los datos son de hace menos de 30 segundos.
  const pedirDirectorio = useCallback(async (forzar: boolean): Promise<Resultado | null> => {
    if (!forzar && enCurso.current) return null;
    if (!forzar && Date.now() - ultimaCargaOk.current < VIDA_DE_LOS_DATOS_MS) return null;

    enCurso.current = true;
    try {
      const directorio = await cargarDirectorio();
      if (!directorio.desdeGuardado) ultimaCargaOk.current = Date.now();
      return { tipo: 'ok', directorio };
    } catch (error) {
      // Sólo llega acá si la API falló Y no hay nada guardado.
      const mensaje = error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.';
      return { tipo: 'error', mensaje };
    } finally {
      enCurso.current = false;
    }
  }, []);

  // Guarda el resultado en el estado, que es lo que leen las pantallas.
  const aplicar = useCallback((resultado: Resultado | null) => {
    if (resultado === null) return;
    if (resultado.tipo === 'error') {
      setMensajeError(resultado.mensaje);
      setEstado('error');
      return;
    }
    setComercios(resultado.directorio.comercios);
    setRubros(resultado.directorio.rubros);
    setDesdeGuardado(resultado.directorio.desdeGuardado);
    setActualizadoEn(resultado.directorio.actualizadoEn);
    setEstado('listo');
  }, []);

  // Se carga al abrir la app y cada vez que cambia la conexión: al volver internet, lo viejo
  // se actualiza solo. `isInternetReachable` es undefined hasta que el sistema responde.
  // El estado se cambia recién cuando llega la respuesta (en el .then), no dentro del efecto.
  const red = useNetworkState();
  const hayInternet = red.isInternetReachable ?? red.isConnected ?? true;
  useEffect(() => {
    void pedirDirectorio(true).then(aplicar);
  }, [hayInternet, pedirDirectorio, aplicar]);

  const recargar = useCallback(() => pedirDirectorio(false).then(aplicar), [pedirDirectorio, aplicar]);

  function reintentar() {
    setEstado('cargando');
    void pedirDirectorio(true).then(aplicar);
  }

  return (
    <DirectorioContext.Provider
      value={{
        estado,
        comercios,
        rubros,
        desdeGuardado,
        actualizadoEn,
        mensajeError,
        recargar,
        reintentar,
      }}>
      {children}
    </DirectorioContext.Provider>
  );
}

export function useDirectorio(): ValorDirectorio {
  const valor = useContext(DirectorioContext);
  if (valor === null) {
    throw new Error('useDirectorio tiene que usarse dentro de un DirectorioProvider.');
  }
  return valor;
}
