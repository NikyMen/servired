import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/conversaciones/[id]/mensajes — envía un mensaje en la conversación
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { sender, text } = (body ?? {}) as Record<string, unknown>;

  if (sender !== "cliente" && sender !== "profesional") {
    return NextResponse.json({ error: "Remitente inválido." }, { status: 422 });
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Escribí un mensaje." }, { status: 422 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: { conversationId: id, sender, text: text.trim() },
  });
  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json(message, { status: 201 });
}
