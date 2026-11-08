import { validarCuenta } from '@/utilidades/cuenta';

const valida = { nombre: 'Marta', email: 'marta@mail.com', contrasena: 'demo1234' };

describe('validarCuenta', () => {
  it('acepta datos correctos en el registro y en el ingreso', () => {
    expect(validarCuenta(valida, true)).toBeNull();
    expect(validarCuenta(valida, false)).toBeNull();
  });

  it('en el registro exige nombre; en el ingreso no', () => {
    const sinNombre = { ...valida, nombre: '   ' };
    expect(validarCuenta(sinNombre, true)).toBe('El nombre tiene que tener entre 1 y 80 letras.');
    expect(validarCuenta(sinNombre, false)).toBeNull();
  });

  it('rechaza un nombre de más de 80 letras', () => {
    expect(validarCuenta({ ...valida, nombre: 'a'.repeat(81) }, true)).toBe(
      'El nombre tiene que tener entre 1 y 80 letras.',
    );
  });

  it('rechaza emails sin arroba o sin dominio', () => {
    expect(validarCuenta({ ...valida, email: 'marta' }, false)).toBe('El email no es válido.');
    expect(validarCuenta({ ...valida, email: 'marta@mail' }, false)).toBe('El email no es válido.');
    expect(validarCuenta({ ...valida, email: 'mar ta@mail.com' }, false)).toBe('El email no es válido.');
  });

  it('ignora los espacios al principio y al final del email', () => {
    expect(validarCuenta({ ...valida, email: '  marta@mail.com ' }, false)).toBeNull();
  });

  it('exige una contraseña de entre 8 y 100 caracteres', () => {
    expect(validarCuenta({ ...valida, contrasena: '1234567' }, false)).toBe(
      'La contraseña tiene que tener al menos 8 caracteres.',
    );
    expect(validarCuenta({ ...valida, contrasena: 'a'.repeat(101) }, false)).toBe(
      'La contraseña puede tener como máximo 100 caracteres.',
    );
    expect(validarCuenta({ ...valida, contrasena: 'a'.repeat(100) }, false)).toBeNull();
  });
});
