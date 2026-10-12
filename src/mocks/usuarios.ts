import type { Usuario } from '@/tipos';

export const usuariosMock: Usuario[] = [
  {
    id: 'usr-512',
    nombre: 'Marta Giménez',
    email: 'marta@mail.com',
    rol: 'vecino',
    comercioId: null,
    favoritos: ['com-118'],
    rubrosDeInteres: ['rub-ferreteria'],
    avisosActivos: true,
  },
  {
    id: 'usr-900',
    nombre: 'Héctor (Ferretería El Tornillo)',
    email: 'tornillo@mail.com',
    rol: 'comercio',
    comercioId: 'com-118',
    favoritos: [],
    rubrosDeInteres: [],
    avisosActivos: true,
  },
];
