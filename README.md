# Directorio de Comercios — Concepción del Uruguay

App móvil del trabajo final integrador de "Desarrollo para Móviles"
(Tecnicatura en Desarrollo Web, UNER, 2026).

## Stack

- Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript
- Navegación: Expo Router (rutas por archivo en `src/app/`)

## Comandos

```bash
npm install                 # instalar dependencias
npx expo start              # servidor de desarrollo
npx expo install <paquete>  # instalar paquetes alineados con el SDK
npx expo lint               # linter
npx tsc --noEmit            # chequeo de tipos
npm test                    # tests (jest-expo)
```

## Estructura

- `src/app/` — pantallas y rutas (Expo Router).
- `src/components/` — componentes reutilizables.
- `src/tipos/` — forma de los datos (`Comercio`, `Horario`, `Rubro`, `MedioDePago`…).
- `src/mocks/` — datos de prueba ficticios (teléfonos con prefijo 000 a propósito).
- `src/servicios/` — única puerta de acceso a los datos. Hoy devuelve mocks; cuando
  exista la API solo cambia el interior de las funciones.
- `src/utilidades/` — lógica pura (horarios, "abierto ahora", fechas, usuarios).
- `__tests__/` — tests.

## Convenciones

- Nombres en español; componentes en PascalCase, con una `interface Props` cada uno.
- Las pantallas y componentes usan `servicios/`, nunca importan desde `mocks/`.
- Listas con `FlatList`/`SectionList` y `keyExtractor` por `id`.
- Los mocks incluyen casos borde a propósito (sin fotos, sin teléfono, inactivo,
  en vacaciones, imagen rota, rubros sin comercios).
- Los tipos y formatos son provisorios hasta contar con la API de la cátedra.
