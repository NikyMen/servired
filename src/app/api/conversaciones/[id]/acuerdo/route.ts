import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantIn } from "@/lib/mensajes-server";
import { OPEN_BOOKING_STATUSES, expirePendingProposals } from "@/lib/workflow";
import { canRevealPaymentDetails } from "@/lib/payments";

async function currentBooking(userId: string, professionalId: string) {
  await expirePendingProposals();
  return prisma.booking.findFirst({ where: { userId, professionalId, status: { in: OPEN_BOOKING_STATUSES } }, orderBy: { updatedAt: "desc" }, include: { proposals: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" }, select: { id: true, status: true } }, professional: { select: { paymentAlias: true, paymentCvu: true } } } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!role || !conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  const booking = await currentBooking(conversation.userId, conversation.professionalId);
  if (!booking) return NextResponse.json({ booking: null });
  const { professional, ...safeBooking } = booking;
  const revealPayment = role === "cliente" && canRevealPaymentDetails(booking.status);
  return NextResponse.json({ booking: { ...safeBooking, paymentAlias: revealPayment ? professional.paymentAlias : null, paymentCvu: revealPayment ? professional.paymentCvu : null } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!role || !conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!user.canInteract) return NextResponse.json({ error: "Tu cuenta todavía no fue aprobada." }, { status: 403 });
  if (role === "profesional" && user.professionalStatus !== "approved") return NextResponse.json({ error: "Tu perfil profesional todavía no fue aprobado." }, { status: 403 });
  if (body?.action !== "request" || role !== "cliente") return NextResponse.json({ error: "Acción inválida." }, { status: 422 });
  if (conversation.professional.profileStatus !== "approved" || (conversation.professional.user && conversation.professional.user.accountStatus !== "approved")) return NextResponse.json({ error: "Ese oferente todavía no está habilitado para recibir trabajos." }, { status: 409 });
  const detail = typeof body.detail === "string" ? body.detail.trim() : "";
  if (detail.length < 8) return NextResponse.json({ error: "Contá brevemente qué trabajo necesitás." }, { status: 422 });
  if (await currentBooking(conversation.userId, conversation.professionalId)) return NextResponse.json({ error: "Ya hay un trabajo activo en esta conversación." }, { status: 409 });
  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({ data: { userId: conversation.userId, clientName: conversation.clientName, professionalId: conversation.professionalId, note: detail.slice(0, 2000), status: "requested" } });
    await tx.message.create({ data: { conversationId: conversation.id, sender: "cliente", text: `📋 SOLICITUD DE TRABAJO · ${detail.slice(0, 2000)}` } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return created;
  });
  return NextResponse.json(booking, { status: 201 });
}
