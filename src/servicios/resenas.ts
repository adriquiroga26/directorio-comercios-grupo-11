import { resenasMock, usuariosMock } from '@/mocks';
import type { Resena } from '@/tipos';
import { nombrePublico } from '@/utilidades/usuarios';

import { respuestaMock } from './cliente';

// Sólo lectura por ahora: crear, editar/borrar la propia, reportar, y que
// el comercio responda necesitan una cuenta (el PRD: "la cuenta hace falta
// para dejar reseñas"), y el login con token + biometría es Unidad 6,
// todavía no vista. Se deja pendiente hasta esa unidad.

export interface ResenaConAutor extends Resena {
  nombreAutor: string; // "Marta G.", como en el mockup del PRD
}

export async function listarResenasDeComercio(comercioId: string): Promise<ResenaConAutor[]> {
  const { datos } = await respuestaMock(() => {
    const propias = resenasMock
      .filter((r) => r.comercioId === comercioId)
      .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn)); // más nueva primero

    return propias.map((r) => {
      const autor = usuariosMock.find((u) => u.id === r.usuarioId);
      return { ...r, nombreAutor: autor ? nombrePublico(autor.nombre) : 'Vecino/a' };
    });
  }, []);

  return datos;
}
