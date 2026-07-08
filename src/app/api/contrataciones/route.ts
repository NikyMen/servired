import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_CLIENT_NAME } from "@/lib/demo";

// POST /api/contrataciones — el cliente contrata a un profesional
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { professionalId, serviceId, note } = (body ?? {}) as Record<string, unknown>;

  if (typeof professionalId !== "string" || !professionalId) {
    return NextResponse.json({ error: "Falta el profesional." }, { status: 422 });
  }

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional) {
    return NextResponse.json({ error: "El profesional no existe." }, { status: 404 });
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

  const booking = await prisma.booking.create({
    data: {
      clientName: DEMO_CLIENT_NAME,
      professionalId,
      serviceId: service?.id ?? null,
      note: cleanNote,
    },
  });

  // La contratación abre (o retoma) la conversación con el profesional.
  const conversation = await prisma.conversation.upsert({
    where: {
      professionalId_clientName: { professionalId, clientName: DEMO_CLIENT_NAME },
    },
    create: { professionalId, clientName: DEMO_CLIENT_NAME },
    update: {},
  });

  const intro = service
    ? `Hola, quiero contratar "${service.title}".`
    : "Hola, quiero contratar tus servicios.";

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
