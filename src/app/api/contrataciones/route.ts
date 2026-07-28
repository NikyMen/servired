import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const UPLOAD_URL = /^\/uploads\/[a-f0-9]{32}\.[a-z]{3,4}$/;

// POST /api/contrataciones — el cliente contrata a un profesional
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Entrá para poder contratar." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { professionalId, serviceId, note, attachments: rawAttachments } = (body ?? {}) as Record<string, unknown>;

  if (typeof professionalId !== "string" || !professionalId) {
    return NextResponse.json({ error: "Falta el profesional." }, { status: 422 });
  }

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional) {
    return NextResponse.json({ error: "El profesional no existe." }, { status: 404 });
  }
  if (professional.userId === user.id) {
    return NextResponse.json({ error: "No podés contratarte a vos mismo." }, { status: 422 });
  }

  let service = null;
  if (typeof serviceId === "string" && serviceId) {
    service = await prisma.service.findFirst({
      where: { id: serviceId, professionalId },
    });
    if (!service) {
      return NextResponse.json({ error: "El servicio no existe." }, { status: 404 });
    }
  }

  const cleanNote = typeof note === "string" && note.trim() ? note.trim() : null;

  if (rawAttachments != null && !Array.isArray(rawAttachments)) {
    return NextResponse.json({ error: "Adjuntos inválidos." }, { status: 422 });
  }
  if (Array.isArray(rawAttachments) && rawAttachments.length > 6) {
    return NextResponse.json({ error: "Podés adjuntar hasta 6 imágenes." }, { status: 422 });
  }
  const attachmentItems = Array.isArray(rawAttachments) ? rawAttachments.slice(0, 6) : [];
  const attachments = [];
  for (const item of attachmentItems) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "Adjunto inválido." }, { status: 422 });
    }
    const attachment = item as Record<string, unknown>;
    const url = attachment.url;
    const type = attachment.type;
    if (typeof url !== "string" || !UPLOAD_URL.test(url) || typeof type !== "string" || !IMAGE_TYPES.has(type)) {
      return NextResponse.json({ error: "Solo se aceptan imágenes válidas." }, { status: 422 });
    }
    attachments.push({
      url,
      type,
      name: typeof attachment.name === "string" ? attachment.name.slice(0, 80) : "imagen",
      size: typeof attachment.size === "number" && attachment.size >= 0 ? attachment.size : null,
    });
  }

  const booking = await prisma.booking.create({
    data: {
      clientName: user.name,
      userId: user.id,
      professionalId,
      serviceId: service?.id ?? null,
      note: cleanNote,
      attachments: { create: attachments },
    },
  });

  // La contratación abre (o retoma) la conversación con el profesional.
  const conversation = await prisma.conversation.upsert({
    where: { professionalId_userId: { professionalId, userId: user.id } },
    create: { professionalId, userId: user.id, clientName: user.name },
    update: {},
  });

  const intro = service
    ? `Hola, te envié una propuesta para "${service.title}".`
    : "Hola, te envié una propuesta de trabajo.";

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: "cliente",
      text: cleanNote ? `${intro} ${cleanNote}` : intro,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(booking, { status: 201 });
}
