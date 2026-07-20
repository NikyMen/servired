import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/solicitudes/[id]/responder
 * El profesional le contesta a quien publicó una solicitud abierta.
 *
 * Va aparte de /api/conversaciones porque el sentido es al revés: ahí el cliente
 * le escribe a un profesional, y acá el profesional le escribe a un cliente.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entrá para responder." }, { status: 401 });
  if (user.role !== "profesional" || !user.professionalId) {
    return NextResponse.json(
      { error: "Solo los profesionales pueden responder solicitudes." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || text.trim().length < 2) {
    return NextResponse.json({ error: "Escribí un mensaje." }, { status: 422 });
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, user: { select: { name: true } } },
  });
  if (!request) {
    return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  }
  if (request.status !== "abierta") {
    return NextResponse.json({ error: "Esa solicitud ya está cerrada." }, { status: 422 });
  }
  if (request.userId === user.id) {
    return NextResponse.json({ error: "Esa solicitud es tuya." }, { status: 422 });
  }

  // Retoma el hilo si ya se habían escrito antes.
  const conversation = await prisma.conversation.upsert({
    where: {
      professionalId_userId: { professionalId: user.professionalId, userId: request.userId },
    },
    create: {
      professionalId: user.professionalId,
      userId: request.userId,
      clientName: request.user.name,
    },
    update: {},
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "profesional",
      text: text.trim().slice(0, 4000),
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
