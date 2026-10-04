import { prisma } from "@/lib/prisma";
import { PLANES_DEFAULT, PLANES_SLUG, sanearPlanes, type PlanesConfig } from "@/lib/planes-config";

/**
 * Los planes viven como JSON en `SiteText` (clave "planes"), igual que los
 * términos: así no hace falta tocar el esquema. Sin fila, va la maqueta original.
 */
export async function getPlanesConfig(): Promise<PlanesConfig & { updatedAt: Date | null }> {
  const fila = await prisma.siteText.findUnique({ where: { slug: PLANES_SLUG } });
  if (!fila) return { ...PLANES_DEFAULT, updatedAt: null };
  try {
    return { ...sanearPlanes(JSON.parse(fila.body)), updatedAt: fila.updatedAt };
  } catch {
    return { ...PLANES_DEFAULT, updatedAt: fila.updatedAt };
  }
}

export async function guardarPlanes(crudo: unknown) {
  const config = sanearPlanes(crudo);
  if (!config.planes.length) return { error: "Tiene que quedar al menos un plan con nombre." };
  const body = JSON.stringify(config);
  await prisma.siteText.upsert({ where: { slug: PLANES_SLUG }, create: { slug: PLANES_SLUG, title: "Planes", body }, update: { body } });
  return { ok: true as const, config };
}

/** Vuelve a la maqueta original: borra lo guardado. */
export async function restaurarPlanes() {
  await prisma.siteText.deleteMany({ where: { slug: PLANES_SLUG } });
}
