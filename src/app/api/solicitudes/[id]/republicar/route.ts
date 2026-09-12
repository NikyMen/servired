import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";
import { MAX_REPUBLISH, REQUEST_TTL_MS, REQUEST_WARN_MS } from "@/lib/solicitudes";

export const dynamic = "force-dynamic";

/**
 * POST /api/solicitudes/[id]/republicar
 * Le da otros 7 días a una solicitud propia que venció o está por vencer.
 *
 * Se limpia `warnedAt` para que el aviso del sexto día vuelva a salir, y los
 * descartes NO se borran: si un oferente ya dijo que no le interesa, republicar
 * no se lo vuelve a poner adelante.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;

  const request = await prisma.serviceRequest.findUnique({ where: { id }, select: { userId: true, status: true, expiresAt: true, republishCount: true } });
  if (!request || request.userId !== user.id) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  if (request.status === "cerrada") return NextResponse.json({ error: "Esa solicitud está cerrada." }, { status: 422 });
  if (request.republishCount >= MAX_REPUBLISH) return NextResponse.json({ error: "Ya la republicaste varias veces. Publicá una nueva para que la vean como recién salida." }, { status: 422 });

  // Antes del último día todavía está a la vista: republicarla no suma nada.
  const now = new Date();
  if (request.status === "abierta" && request.expiresAt.getTime() - now.getTime() > REQUEST_WARN_MS) {
    return NextResponse.json({ error: "Todavía le queda tiempo: vas a poder republicarla el último día." }, { status: 422 });
  }

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: { status: "abierta", expiresAt: new Date(now.getTime() + REQUEST_TTL_MS), warnedAt: null, republishCount: { increment: 1 } },
  });
  return NextResponse.json({ ok: true, expiresAt: updated.expiresAt, republishCount: updated.republishCount });
}
