import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_CLIENT_NAME } from "@/lib/demo";

// POST /api/conversaciones — abre (o retoma) una conversación y envía un mensaje
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { professionalId, text, clientName, sender } = (body ?? {}) as Record<string, unknown>;

  if (typeof professionalId !== "string" || !professionalId) {
    return NextResponse.json({ error: "Falta el profesional." }, { status: 422 });
  }
  if (typeof text !== "string" || text.trim().length < 2) {
    return NextResponse.json({ error: "Escribí un mensaje." }, { status: 422 });
  }

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional) {
    return NextResponse.json({ error: "El profesional no existe." }, { status: 404 });
  }

  const client =
    typeof clientName === "string" && clientName.trim() ? clientName.trim() : DEMO_CLIENT_NAME;
  const from = sender === "profesional" ? "profesional" : "cliente";

  const conversation = await prisma.conversation.upsert({
    where: { professionalId_clientName: { professionalId, clientName: client } },
    create: { professionalId, clientName: client },
    update: {},
  });

  await prisma.message.create({
    data: { conversationId: conversation.id, sender: from, text: text.trim() },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
