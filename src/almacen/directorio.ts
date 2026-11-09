import Storage from 'expo-sqlite/kv-store';

import type { Comercio, Rubro } from '@/tipos';

import { abrirBase } from './baseDeDatos';

// El directorio de comercios guardado en el teléfono. Los datos van en SQLite (las tablas
// `comercios` y `rubros`); la fecha de la última actualización va en el kv-store, que es el
// almacén de clave y valor de expo-sqlite y sirve para datos sueltos y chicos.
const CLAVE_ACTUALIZADO_EN = 'directorio.actualizadoEn';

export interface DirectorioGuardado {
  comercios: Comercio[];
  rubros: Rubro[];
  // Cuándo se bajaron estos datos de la API (fecha ISO), o null si no se sabe.
  actualizadoEn: string | null;
}

// Guarda el directorio ENTERO, reemplazando lo anterior: así un comercio que la API ya no
// devuelve (porque se dio de baja) también desaparece del teléfono. Todo va en una
// transacción: o se guarda completo o no se guarda nada, nunca queda a medias.
// Devuelve la fecha de actualización (ahora).
export async function guardarDirectorio(comercios: Comercio[], rubros: Rubro[]): Promise<string> {
  const base = await abrirBase();

  await base.withTransactionAsync(async () => {
    await base.runAsync('DELETE FROM comercios');
    await base.runAsync('DELETE FROM rubros');
    for (const [orden, comercio] of comercios.entries()) {
      await base.runAsync(
        'INSERT INTO comercios (id, orden, nombre, rubro_id, datos) VALUES (?, ?, ?, ?, ?)',
        comercio.id,
        orden,
        comercio.nombre,
        comercio.rubroId,
        JSON.stringify(comercio),
      );
    }
    for (const [orden, rubro] of rubros.entries()) {
      await base.runAsync(
        'INSERT INTO rubros (id, orden, datos) VALUES (?, ?, ?)',
        rubro.id,
        orden,
        JSON.stringify(rubro),
      );
    }
  });

  const ahora = new Date().toISOString();
  await Storage.setItem(CLAVE_ACTUALIZADO_EN, ahora);
  return ahora;
}

// Lo guardado, o null si todavía no hay nada (la app nunca se abrió con conexión).
export async function leerDirectorio(): Promise<DirectorioGuardado | null> {
  const base = await abrirBase();

  const filasComercios = await base.getAllAsync<{ datos: string }>(
    'SELECT datos FROM comercios ORDER BY orden',
  );
  if (filasComercios.length === 0) return null;
  const filasRubros = await base.getAllAsync<{ datos: string }>(
    'SELECT datos FROM rubros ORDER BY orden',
  );

  return {
    comercios: filasComercios.map((fila) => JSON.parse(fila.datos) as Comercio),
    rubros: filasRubros.map((fila) => JSON.parse(fila.datos) as Rubro),
    actualizadoEn: await Storage.getItem(CLAVE_ACTUALIZADO_EN),
  };
}

// Un solo comercio guardado (para abrir su ficha sin conexión), o null si no está.
export async function leerComercioGuardado(id: string): Promise<Comercio | null> {
  const base = await abrirBase();
  const fila = await base.getFirstAsync<{ datos: string }>(
    'SELECT datos FROM comercios WHERE id = ?',
    id,
  );
  return fila === null ? null : (JSON.parse(fila.datos) as Comercio);
}
