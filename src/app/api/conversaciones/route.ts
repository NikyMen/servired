import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { CLIENT_BLUE, PRO_GREEN } from "@/lib/brand";

export const dynamic = "force-dynamic";

// GET /api/conversaciones?como=pro — los hilos del que mira, listos para <Chat>.
// Existe para el popup flotante de mensajes: las páginas /mensajes y
// /pro/mensajes hacen la misma consulta directo con Prisma en el servidor.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Entrá para ver tus mensajes." }, { status: 401 });
  }

  const comoPro = req.nextUrl.searchParams.get("como") === "pro";
  if (comoPro && !user.professionalId) {
    return NextResponse.json({ error: "No tenés perfil profesional." }, { status: 403 });
  }

  const conversations = await prisma.conversation.findMany({
    where: comoPro ? { professionalId: user.professionalId! } : { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      professional: { select: { name: true, avatarColor: true } },
      user: { select: { avatarColor: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      withName: comoPro ? c.clientName : c.professional.name,
      // Mismos fallbacks que las páginas: azul para clientes, verde para pros.
      withColor: comoPro
        ? c.user.avatarColor || CLIENT_BLUE
        : c.professional.avatarColor || PRO_GREEN,
      messages: c.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentType: m.attachmentType,
        attachmentSize: m.attachmentSize,
      })),
    })),
  });
}

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
