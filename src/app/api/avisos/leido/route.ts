import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/avisos/leido
 * Marca leídos los avisos de la campanita. Se llama al abrirla.
 *
 * No recibe ids: abrir la campanita es ver todo lo que había. Quedarse con la
 * mitad sin leer sería pedirle a la persona que marque una por una.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: true });
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
