/**
 * Reglas de vigencia de las solicitudes, sin base de datos.
 *
 * Viven aparte de `workflow.ts` porque el bloque de "mis solicitudes" es un
 * componente de cliente, y `workflow.ts` arrastra Prisma. Mismo corte que hay
 * entre `mensajes.ts` y `mensajes-server.ts`.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

/** Una solicitud vive una semana; el último día se avisa que está por vencer. */
export const REQUEST_TTL_MS = 7 * DIA_MS;
export const REQUEST_WARN_MS = DIA_MS;
/** Después de esto conviene publicar una nueva en vez de revivir la vieja. */
export const MAX_REPUBLISH = 5;

/** Días enteros que le quedan de vida. Nunca menos de cero. */
export function requestDaysLeft(expiresAt: Date | string, now = new Date()) {
  const value = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.max(0, Math.ceil((value.getTime() - now.getTime()) / DIA_MS));
}

/** Está en la ventana en la que se avisa y se puede republicar. */
export function requestIsLastDay(expiresAt: Date | string, now = new Date()) {
  const value = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return value.getTime() - now.getTime() <= REQUEST_WARN_MS;
}
