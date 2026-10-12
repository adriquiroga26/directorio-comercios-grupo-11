import { nombrePublico } from '@/utilidades/usuarios';

describe('nombrePublico', () => {
  it('nombre y apellido: deja el nombre y la inicial del apellido', () => {
    expect(nombrePublico('Marta Giménez')).toBe('Marta G.');
  });

  it('un solo nombre: lo deja tal cual', () => {
    expect(nombrePublico('Héctor')).toBe('Héctor');
  });

  it('con más de dos palabras usa sólo la segunda como apellido', () => {
    expect(nombrePublico('Juan Pablo Rodríguez')).toBe('Juan P.');
  });
});
