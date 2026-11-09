import type { Horario } from '@/tipos';

import { claveDelDia } from './fechas';
import { NOMBRES_DIA } from './horarios';

// Utilidades para editar los horarios y el cierre por vacaciones del comercio. Son funciones
// puras (sin pantalla) para poder probarlas solas. Las reglas son las de la API.

const MAXIMO_TRAMOS = 50;

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function conCeros(numero: number): string {
  return String(numero).padStart(2, '0');
}

// "08:30" -> un Date con esa hora (el día no importa: el selector de hora sólo usa la hora).
export function fechaDeHora(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m);
}

// Un Date que eligió el usuario en el reloj -> "08:30".
export function horaDeFecha(fecha: Date): string {
  return `${conCeros(fecha.getHours())}:${conCeros(fecha.getMinutes())}`;
}

// Devuelve el primer problema (texto para mostrar) o null si los horarios se pueden guardar.
// Reglas de la API: cada tramo abre ANTES de cerrar (uno que cruza la medianoche se carga
// como dos, de días distintos) y dos tramos del mismo día no se pisan (que uno empiece justo
// cuando termina el otro está bien).
export function validarHorarios(horarios: Horario[]): string | null {
  if (horarios.length > MAXIMO_TRAMOS) {
    return `Se pueden cargar hasta ${MAXIMO_TRAMOS} tramos de horario.`;
  }

  for (const tramo of horarios) {
    if (aMinutos(tramo.abre) >= aMinutos(tramo.cierra)) {
      return `El ${NOMBRES_DIA[tramo.dia]} tiene un tramo que abre ${tramo.abre} y cierra ${tramo.cierra}: tiene que abrir antes de cerrar.`;
    }
  }

  for (let dia = 0; dia <= 6; dia++) {
    const delDia = horarios
      .filter((t) => t.dia === dia)
      .sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));
    for (let i = 1; i < delDia.length; i++) {
      if (aMinutos(delDia[i].abre) < aMinutos(delDia[i - 1].cierra)) {
        return `El ${NOMBRES_DIA[dia]} tiene tramos que se pisan.`;
      }
    }
  }

  return null;
}

// Dos listas de tramos son "los mismos" aunque estén en otro orden.
export function mismosHorarios(a: Horario[], b: Horario[]): boolean {
  const clave = (t: Horario) => `${t.dia}|${t.abre}|${t.cierra}`;
  const ordenadas = (lista: Horario[]) => lista.map(clave).sort();
  const izquierda = ordenadas(a);
  const derecha = ordenadas(b);
  return izquierda.length === derecha.length && izquierda.every((c, i) => c === derecha[i]);
}

// Para cerrar por vacaciones se elige el ÚLTIMO día cerrado: no puede ser un día ya pasado
// (la API lo acepta pero no hace nada, y se prestaría a confusión). Hoy sí vale.
export function validarCierre(ultimoDia: Date, hoy: Date = new Date()): string | null {
  if (claveDelDia(ultimoDia) < claveDelDia(hoy)) {
    return 'El último día de cierre no puede ser un día que ya pasó.';
  }
  return null;
}
