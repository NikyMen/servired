import { prisma } from "@/lib/prisma";

/**
 * Identidades de la demo (sin sistema de cuentas todavía):
 * - El cliente "logueado" es María G.
 * - El profesional "logueado" es el electricista del seed.
 */
export const DEMO_CLIENT_NAME = "María G.";

/** Color de avatar del cliente (azul = busca servicios). */
export const CLIENT_BLUE = "#2563eb";

/** Color de avatar del profesional (verde = ofrece servicios). */
export const PRO_GREEN = "#059669";

export async function getDemoPro() {
  return prisma.professional.findFirst({
    where: { category: { slug: "electricidad" } },
    orderBy: { createdAt: "asc" },
  });
}
