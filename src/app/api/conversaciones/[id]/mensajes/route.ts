import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantIn } from "@/lib/mensajes-server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

// GET /api/conversaciones/[id]/mensajes — mensajes del hilo (lo usa el polling)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);

  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!conversation) {
    return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  }
  // Mismo 404 que si no existiera: no confirmamos la existencia de hilos ajenos.
  if (!role) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      attachmentUrl: m.attachmentUrl,
      attachmentName: m.attachmentName,
      attachmentType: m.attachmentType,
      attachmentSize: m.attachmentSize,
    })),
  });
}

// POST /api/conversaciones/[id]/mensajes — envía un mensaje (texto y/o adjunto)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);

  if (!user) return NextResponse.json({ error: "Entrá para poder escribir." }, { status: 401 });
  if (!user.canInteract) return NextResponse.json({ error: "Tu cuenta todavía no fue aprobada." }, { status: 403 });
  if (!conversation || !role) {
    return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  }
  if (role === "profesional" && user.professionalStatus !== "approved") return NextResponse.json({ error: "Tu perfil profesional todavía no fue aprobado." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { text, attachmentUrl, attachmentName, attachmentType, attachmentSize } = (body ??
    {}) as Record<string, unknown>;

  const cleanText = typeof text === "string" ? text.trim().slice(0, 4000) : "";

  // El adjunto tiene que venir de nuestro /api/upload: si aceptáramos cualquier
  // URL, el mensaje podría apuntar a un archivo de otro dominio.
  let attachment: {
    url: string;
    name: string;
    type: string;
    size: number | null;
  } | null = null;

  if (attachmentUrl != null) {
    if (typeof attachmentUrl !== "string" || !/^\/uploads\/[a-f0-9]{32}\.[a-z]{3,4}$/.test(attachmentUrl)) {
      return NextResponse.json({ error: "Adjunto inválido." }, { status: 422 });
    }
    if (typeof attachmentType !== "string" || !ALLOWED_TYPES.has(attachmentType)) {
      return NextResponse.json({ error: "Tipo de adjunto no permitido." }, { status: 415 });
    }
    attachment = {
      url: attachmentUrl,
      name: typeof attachmentName === "string" ? attachmentName.slice(0, 80) : "archivo",
      type: attachmentType,
      size: typeof attachmentSize === "number" && attachmentSize >= 0 ? attachmentSize : null,
    };
  }

  if (!cleanText && !attachment) {
    return NextResponse.json({ error: "Escribí algo o adjuntá un archivo." }, { status: 422 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      sender: role, // sale de la sesión, no de lo que mandó el navegador
      text: cleanText,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentType: attachment?.type ?? null,
      attachmentSize: attachment?.size ?? null,
    },
  });

  // Toca el hilo para que suba en la lista, ordenada por updatedAt.
  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json(message, { status: 201 });
}
