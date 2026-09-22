import { NextRequest, NextResponse } from "next/server";
import { fetchMercadoPagoPayment, sellerToken, validWebhookSignature } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { type?: string; user_id?: string | number; data?: { id?: string | number } } | null;
  const dataId = req.nextUrl.searchParams.get("data.id") || (body?.data?.id != null ? String(body.data.id) : null);
  if (!validWebhookSignature(req.headers.get("x-signature"), req.headers.get("x-request-id"), dataId)) return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  if (body?.type !== "payment" || !dataId || !/^\d+$/.test(dataId)) return NextResponse.json({ ok: true });
  // La notificación sólo identifica el recurso; los datos confiables salen de la API.
  const account = body?.user_id != null ? await prisma.mercadoPagoAccount.findUnique({ where: { collectorId: String(body.user_id) }, select: { professionalId: true } }) : null;
  if (!account) return NextResponse.json({ ok: true });
  for (const candidate of [account]) {
    const seller = await sellerToken(candidate.professionalId).catch(() => null);
    if (!seller) continue;
    const remote = await fetchMercadoPagoPayment(seller.token, dataId).catch(() => null);
    if (!remote || String(remote.collector_id) !== seller.collectorId) continue;
    const payment = await prisma.payment.findUnique({ where: { id: remote.external_reference } });
    if (!payment || payment.provider !== "mercadopago" || payment.professionalId !== candidate.professionalId || !payment.bookingId || payment.amount !== remote.transaction_amount || remote.currency_id !== "ARS" || String(remote.id) !== dataId) return NextResponse.json({ error: "Pago inconsistente." }, { status: 409 });
    if (remote.status === "approved" && payment.status === "pendiente") {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.updateMany({ where: { id: payment.id, status: "pendiente" }, data: { status: "pagado", providerPaymentId: dataId, paidAt: new Date(), confirmedAt: new Date() } });
        if (!updated.count) return;
        await tx.booking.updateMany({ where: { id: payment.bookingId!, status: "finished" }, data: { status: "paid_awaiting_review", paidAt: new Date() } });
        await tx.message.create({ data: { conversationId: payment.conversationId, sender: "profesional", text: "✅ PAGO CONFIRMADO POR MERCADO PAGO · El cliente ya puede calificar el trabajo." } });
      });
    }
    if (["refunded", "charged_back"].includes(remote.status) && payment.status === "pagado") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "cancelado" } });
        await tx.booking.updateMany({ where: { id: payment.bookingId!, status: "paid_awaiting_review" }, data: { status: "finished", paidAt: null } });
      });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}
