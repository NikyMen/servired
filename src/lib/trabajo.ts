/**
 * El plazo del trabajo, sin base de datos: lo usa el panel del acuerdo, que es
 * un componente de cliente.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export const MIN_ESTIMATED_DAYS = 1;
export const MAX_ESTIMATED_DAYS = 365;

export function validEstimatedDays(value: unknown) {
  const days = Math.trunc(Number(value));
  return Number.isFinite(days) && days >= MIN_ESTIMATED_DAYS && days <= MAX_ESTIMATED_DAYS ? days : null;
}

export type JobProgress = {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  /** 0 a 100, recortado: la barra no se pasa de largo aunque el trabajo sí. */
  percent: number;
  overdue: boolean;
};

/**
 * Cuánto lleva y cuánto le queda a un trabajo en curso.
 *
 * El día 1 es el primero: alguien que prometió un día y arrancó recién está en
 * "día 1 de 1", no en el cero. Vencido devuelve 100 y `overdue`, para que la
 * barra se pinte de rojo en vez de seguir creciendo.
 */
export function jobProgress(startedAt: Date | string, dueAt: Date | string, now = new Date()): JobProgress {
  const desde = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const hasta = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const total = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / DIA_MS));
  const transcurrido = (now.getTime() - desde.getTime()) / DIA_MS;
  const overdue = now.getTime() > hasta.getTime();
  const elapsedDays = Math.min(total, Math.max(1, Math.ceil(transcurrido) || 1));
  return {
    totalDays: total,
    elapsedDays,
    remainingDays: Math.max(0, Math.ceil((hasta.getTime() - now.getTime()) / DIA_MS)),
    percent: Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100))),
    overdue,
  };
}
