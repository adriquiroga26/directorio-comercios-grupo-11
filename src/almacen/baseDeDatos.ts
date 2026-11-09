import * as SQLite from 'expo-sqlite';

// La base de datos SQLite del teléfono: guarda lo que la app necesita para abrir sin conexión
// (por ahora, el directorio de comercios y los rubros). Es un archivo local, nunca viaja a la API.

const NOMBRE_DE_LA_BASE = 'directorio.db';

// Cada vez que cambia la estructura de las tablas se sube este número y se agrega un paso en
// `migrar`. SQLite guarda el número de versión de la base en `PRAGMA user_version`.
const VERSION_ACTUAL = 2;

// Se abre una sola vez y todos comparten la misma conexión. Se guarda la PROMESA (no la base)
// para que dos pedidos a la vez no la abran dos veces.
let conexion: Promise<SQLite.SQLiteDatabase> | null = null;

export function abrirBase(): Promise<SQLite.SQLiteDatabase> {
  if (conexion === null) {
    conexion = abrirYMigrar().catch((error: unknown) => {
      // Si falló, se vuelve a intentar la próxima vez en lugar de quedar roto para siempre.
      conexion = null;
      throw error;
    });
  }
  return conexion;
}

async function abrirYMigrar(): Promise<SQLite.SQLiteDatabase> {
  const base = await SQLite.openDatabaseAsync(NOMBRE_DE_LA_BASE);
  await migrar(base);
  return base;
}

// Lleva la base a la versión actual: crea las tablas que falten. Si la base ya está al día,
// no hace nada.
async function migrar(base: SQLite.SQLiteDatabase): Promise<void> {
  const fila = await base.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = fila?.user_version ?? 0;
  if (version >= VERSION_ACTUAL) return;

  if (version < 1) {
    // `datos` guarda el comercio entero como texto JSON (con sus horarios y fotos); las demás
    // columnas son las que sirven para ordenar y buscar. `orden` conserva el orden de la API.
    await base.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS comercios (
        id TEXT PRIMARY KEY NOT NULL,
        orden INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        rubro_id TEXT NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rubros (
        id TEXT PRIMARY KEY NOT NULL,
        orden INTEGER NOT NULL,
        datos TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }

  if (version < 2) {
    // La cola de reseñas escritas sin conexión que esperan para enviarse. `id` es el que genera
    // el teléfono (la API lo usa para no duplicar). `error` queda en NULL mientras espera su
    // turno y guarda el motivo si la API la rechazó para siempre.
    await base.execAsync(`
      CREATE TABLE IF NOT EXISTS resenas_pendientes (
        id TEXT PRIMARY KEY NOT NULL,
        usuario_id TEXT NOT NULL,
        comercio_id TEXT NOT NULL,
        estrellas INTEGER NOT NULL,
        comentario TEXT NOT NULL,
        creada_en TEXT NOT NULL,
        error TEXT
      );
      PRAGMA user_version = 2;
    `);
  }
}
