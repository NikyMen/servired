import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/conversaciones — abre (o retoma) una conversación y envía un mensaje
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Entrá para poder escribir." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { professionalId, text } = (body ?? {}) as Record<string, unknown>;

  if (typeof professionalId !== "string" || !professionalId) {
    return NextResponse.json({ error: "Falta el profesional." }, { status: 422 });
  }
  if (typeof text !== "string" || text.trim().length < 2) {
    return NextResponse.json({ error: "Escribí un mensaje." }, { status: 422 });
  }

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { id: true, userId: true },
  });
  if (!professional) {
    return NextResponse.json({ error: "El profesional no existe." }, { status: 404 });
  }
  if (professional.userId === user.id) {
    return NextResponse.json({ error: "No podés escribirte a vos mismo." }, { status: 422 });
  }

  // Un hilo por par cliente-profesional: si ya existe, se retoma.
  const conversation = await prisma.conversation.upsert({
    where: { professionalId_userId: { professionalId, userId: user.id } },
    create: { professionalId, userId: user.id, clientName: user.name },
    update: {},
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "cliente", // quien abre el hilo desde el perfil es siempre el cliente
      text: text.trim().slice(0, 4000),
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
