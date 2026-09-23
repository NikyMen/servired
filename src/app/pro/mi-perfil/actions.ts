"use server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type OfertasDependenciaState = { ok?: boolean; error?: string; value?: boolean } | undefined;

/** "Me gustaría recibir ofertas en relación de dependencia", desde Mi perfil del pro. */
export async function guardarOfertasDependenciaAction(_prev: OfertasDependenciaState, formData: FormData): Promise<OfertasDependenciaState> {
  const user = await getSessionUser();
  if (!user) return { error: "Entrá para cambiar esta opción." };
  const value = formData.get("ofertasDependencia") === "on";
  await prisma.user.update({ where: { id: user.id }, data: { ofertasDependencia: value, ofertasDependenciaAt: value ? new Date() : null } });
  // Se devuelve porque React 19 resetea el form después de la acción.
  return { ok: true, value };
}
