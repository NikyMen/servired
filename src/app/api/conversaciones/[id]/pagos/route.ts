import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantIn } from "@/lib/mensajes-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!role || !conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  const payments = await prisma.payment.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, include: { review: { select: { id: true } } } });
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Entrá para pagar." }, { status: 401 });
  if (role !== "cliente" || !conversation) return NextResponse.json({ error: "Solo el cliente puede iniciar el pago." }, { status: 403 });
  const body = await req.json().catch(() => null) as { amount?: unknown } | null;
  const amount = Math.round(Number(body?.amount));
  if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_000) return NextResponse.json({ error: "Ingresá un monto válido." }, { status: 422 });

  let booking = await prisma.booking.findFirst({
    where: { userId: user.id, professionalId: conversation.professionalId, status: { not: "cancelada" } },
    orderBy: { createdAt: "desc" },
  });
  if (!booking) {
    booking = await prisma.booking.create({ data: { userId: user.id, clientName: user.name, professionalId: conversation.professionalId, note: "Acuerdo iniciado desde mensajería", status: "aceptada" } });
  }
  const commission = Math.round(amount * 0.1);
  const payment = await prisma.payment.create({
    data: { amount, commission, netAmount: amount - commission, userId: user.id, professionalId: conversation.professionalId, conversationId: id, bookingId: booking.id },
    include: { review: { select: { id: true } } },
  });
  return NextResponse.json(payment, { status: 201 });
}

