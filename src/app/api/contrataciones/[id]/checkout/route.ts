import { NextRequest, NextResponse } from "next/server";
import { interactionAccess } from "@/lib/auth";
import { createPreference, mercadoPagoCommission, mercadoPagoConfigured, sellerToken } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!mercadoPagoConfigured()) return NextResponse.json({ error: "Mercado Pago todavía no está configurado." }, { status: 503 });
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id }, include: { professional: { select: { userId: true, profileStatus: true, user: { select: { accountStatus: true } } } }, payments: { where: { provider: "mercadopago", status: "pendiente" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!booking || booking.userId !== access.user.id) return NextResponse.json({ error: "La contratación no existe." }, { status: 404 });
  if (booking.status !== "finished" || !booking.finalPrice || booking.finalPrice <= 0 || booking.professional.profileStatus !== "approved" || booking.professional.user?.accountStatus !== "approved") return NextResponse.json({ error: "El pago no está disponible." }, { status: 409 });
  if (!booking.professional.userId || booking.professional.userId === access.user.id) return NextResponse.json({ error: "El profesional no puede cobrarse a sí mismo." }, { status: 409 });
  const conversation = await prisma.conversation.findUnique({ where: { professionalId_userId: { professionalId: booking.professionalId, userId: booking.userId } } });
  if (!conversation) return NextResponse.json({ error: "No encontramos la conversación." }, { status: 409 });
  try {
    const seller = await sellerToken(booking.professionalId);
    if (!seller) return NextResponse.json({ error: "El profesional todavía no vinculó Mercado Pago." }, { status: 409 });
    const existing = booking.payments[0];
    if (existing?.checkoutUrl) return NextResponse.json({ url: existing.checkoutUrl });
    const commission = mercadoPagoCommission(booking.finalPrice);
    const payment = existing ?? await prisma.payment.create({ data: { amount: booking.finalPrice, commission, netAmount: booking.finalPrice - commission, provider: "mercadopago", status: "pendiente", userId: booking.userId, professionalId: booking.professionalId, conversationId: conversation.id, bookingId: booking.id } });
    const preference = await createPreference(seller.token, { id: payment.id, amount: payment.amount, commission: payment.commission, bookingId: booking.id, clientEmail: access.user.email });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerPreferenceId: preference.id, checkoutUrl: preference.url } });
    return NextResponse.json({ url: preference.url });
  } catch {
    return NextResponse.json({ error: "No pudimos iniciar el pago. Intentá de nuevo." }, { status: 502 });
  }
}
