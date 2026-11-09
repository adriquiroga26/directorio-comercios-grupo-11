import { guardarDirectorio, leerDirectorio } from '@/almacen/directorio';
import { sincronizarFotos } from '@/almacen/fotos';
import type { Comercio, Rubro } from '@/tipos';

import { listarComercios, listarRubros } from './comercios';

export interface Directorio {
  comercios: Comercio[];
  rubros: Rubro[];
  // true si NO se pudo actualizar y estos datos vienen guardados en el teléfono.
  desdeGuardado: boolean;
  // Cuándo se bajaron de la API estos datos (fecha ISO), o null si no se sabe.
  actualizadoEn: string | null;
}

// El directorio (comercios y rubros) con respaldo en el teléfono. Es lo que pide el PRD: "sin
// datos tiene que mostrar algo". La regla:
//  1. Se pide a la API. Si responde, se muestran los datos nuevos y se guardan en SQLite.
//  2. Si la API no responde (sin conexión, servidor caído, error), se muestran los guardados.
//  3. Sólo si no hay nada guardado (primera vez sin conexión) se deja pasar el error.
export async function cargarDirectorio(): Promise<Directorio> {
  try {
    const [comercios, rubros] = await Promise.all([listarComercios(), listarRubros()]);
    // Guardar es un extra: si falla (por ejemplo, la base no se pudo abrir), igual se muestran
    // los datos que acaban de llegar.
    const actualizadoEn = await guardarDirectorio(comercios, rubros).catch(() =>
      new Date().toISOString(),
    );
    // Las fotos se bajan en segundo plano, SIN esperarlas: la pantalla no se demora por ellas, y
    // si alguna falla, se sigue viendo la de la red.
    void sincronizarFotos(comercios).catch(() => {});
    return { comercios, rubros, desdeGuardado: false, actualizadoEn };
  } catch (error) {
    const guardado = await leerDirectorio().catch(() => null);
    if (guardado === null) throw error;
    return { ...guardado, desdeGuardado: true };
  }
}
