import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/solicitudes/[id]/descartar
 * El oferente saca una solicitud de su lista sin contestarla.
 *
 * Es una decisión privada suya: la solicitud sigue abierta para el resto y
 * quien la publicó no se entera. Por eso no toca `status` ni manda mensaje.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;

  const professionalId = user.professionalId;
  if (!professionalId || user.professionalStatus !== "approved") return NextResponse.json({ error: "Necesitás un perfil profesional aprobado." }, { status: 403 });

  const request = await prisma.serviceRequest.findUnique({ where: { id }, select: { userId: true } });
  if (!request) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  if (request.userId === user.id) return NextResponse.json({ error: "Esa solicitud es tuya." }, { status: 422 });

  // Idempotente: descartar dos veces es lo mismo que descartar una.
  await prisma.requestDismissal.upsert({
    where: { requestId_professionalId: { requestId: id, professionalId } },
    create: { requestId: id, professionalId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
