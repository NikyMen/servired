import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantIn } from "@/lib/mensajes-server";

const ACTIVE_STATUSES = ["solicitada", "presupuestada", "aceptada", "completada"];

async function currentBooking(userId: string, professionalId: string) {
  return prisma.booking.findFirst({
    where: { userId, professionalId, status: { in: ACTIVE_STATUSES } },
    orderBy: { updatedAt: "desc" },
    include: {
      service: { select: { title: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { review: { select: { id: true } } },
      },
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!role || !conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });

  const booking = await currentBooking(conversation.userId, conversation.professionalId);
  const agreementSeen = role === "cliente" ? conversation.acuerdoLeidoCliente : conversation.acuerdoLeidoPro;
  const paymentSeen = role === "cliente" ? conversation.pagoLeidoCliente : conversation.pagoLeidoPro;
  const quoteIsNewInProposal = role === "cliente" && booking?.status === "presupuestada" && (!agreementSeen || booking.updatedAt > agreementSeen);
  const quoteIsNewInPayment = role === "cliente" && booking?.status === "presupuestada" && (!paymentSeen || booking.updatedAt > paymentSeen);
  const requestIsNew = role === "profesional" && booking?.status === "solicitada" && (!agreementSeen || booking.createdAt > agreementSeen);
  const latestPayment = booking?.payments[0];
  const paymentIsNew = role === "profesional" && !!latestPayment && (!paymentSeen || latestPayment.updatedAt > paymentSeen);

  return NextResponse.json({
    booking,
    novelty: { proposal: requestIsNew || quoteIsNewInProposal, payment: quoteIsNewInPayment || paymentIsNew },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!role || !conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  if (action === "seen") {
    const kind = body?.kind;
    if (kind !== "proposal" && kind !== "payment") return NextResponse.json({ error: "Novedad inválida." }, { status: 422 });
    const field = kind === "proposal"
      ? role === "cliente" ? "acuerdoLeidoCliente" : "acuerdoLeidoPro"
      : role === "cliente" ? "pagoLeidoCliente" : "pagoLeidoPro";
    await prisma.conversation.update({ where: { id }, data: { [field]: new Date(), updatedAt: conversation.updatedAt } });
    return NextResponse.json({ ok: true });
  }

  if (action === "request") {
    if (role !== "cliente") return NextResponse.json({ error: "Solo el cliente puede pedir un presupuesto." }, { status: 403 });
    const detail = typeof body?.detail === "string" ? body.detail.trim() : "";
    if (detail.length < 8) return NextResponse.json({ error: "Contá brevemente qué trabajo necesitás." }, { status: 422 });
    const existing = await currentBooking(conversation.userId, conversation.professionalId);
    if (existing && ["solicitada", "presupuestada", "aceptada"].includes(existing.status)) {
      return NextResponse.json({ error: "Ya hay una propuesta activa en esta conversación." }, { status: 409 });
    }
    const booking = await prisma.booking.create({ data: { userId: conversation.userId, clientName: conversation.clientName, professionalId: conversation.professionalId, note: detail.slice(0, 2000) } });
    return NextResponse.json(booking, { status: 201 });
  }

  if (action === "quote") {
    if (role !== "profesional") return NextResponse.json({ error: "Solo el profesional puede presupuestar." }, { status: 403 });
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
    const amount = Math.round(Number(body?.amount));
    if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_000) return NextResponse.json({ error: "Ingresá un presupuesto válido." }, { status: 422 });
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId: conversation.userId, professionalId: conversation.professionalId, status: "solicitada" } });
    if (!booking) return NextResponse.json({ error: "La propuesta ya no está disponible." }, { status: 409 });
    const updated = await prisma.booking.update({ where: { id: booking.id }, data: { quotedPrice: amount, status: "presupuestada" } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 422 });
}
