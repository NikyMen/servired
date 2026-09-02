import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";
import { ACTIVE_JOB_STATUSES, PROPOSAL_TTL_MS, expirePendingProposals, hasJobCapacity, proposalIsActive } from "@/lib/workflow";
import { manualAliasProvider } from "@/lib/payments";

function messageText(amount: number) { return `$${amount.toLocaleString("es-AR")}`; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;
  const { id } = await params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : typeof body?.status === "string" ? body.status : "";
  await expirePendingProposals(id);
  const booking = await prisma.booking.findUnique({ where: { id }, include: { professional: { include: { user: { select: { accountStatus: true } } } }, proposals: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } } } });
  if (!booking) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  const viewer = booking.userId === user.id ? "cliente" : booking.professional.userId === user.id ? "profesional" : null;
  if (!viewer) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  if (viewer === "profesional" && user.professionalStatus !== "approved") return NextResponse.json({ error: "Tu perfil profesional todavía no fue aprobado." }, { status: 403 });
  const conversation = await prisma.conversation.findUnique({ where: { professionalId_userId: { professionalId: booking.professionalId, userId: booking.userId } } });

  if (action === "send_proposal" || action === "presupuestada") {
    if (viewer !== "profesional" || booking.status !== "requested") return NextResponse.json({ error: "No podés presupuestar esta solicitud." }, { status: 409 });
    const amount = Math.round(Number(body?.amount ?? body?.quotedPrice));
    const proposalMessage = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : null;
    if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_000) return NextResponse.json({ error: "Ingresá un presupuesto válido." }, { status: 422 });
    const proposal = await prisma.$transaction(async (tx) => {
      const pending = await tx.proposal.findFirst({ where: { bookingId: id, status: "pending", expiresAt: { gt: new Date() } } });
      if (pending) throw new Error("ACTIVE_PROPOSAL");
      return tx.proposal.create({ data: { bookingId: id, amount, message: proposalMessage, expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS) } });
    }).catch((error) => { if (error instanceof Error && error.message === "ACTIVE_PROPOSAL") return null; throw error; });
    if (!proposal) return NextResponse.json({ error: "Ya hay una propuesta activa. El cliente debe rechazarla o esperar su vencimiento." }, { status: 409 });
    if (conversation) await prisma.$transaction([prisma.message.create({ data: { conversationId: conversation.id, sender: "profesional", text: `💰 PROPUESTA · ${messageText(amount)} · Vence en 3 días${proposalMessage ? ` · ${proposalMessage}` : ""}` } }), prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })]);
    return NextResponse.json(proposal, { status: 201 });
  }

  if (action === "reject_proposal") {
    if (viewer !== "cliente") return NextResponse.json({ error: "Solo el cliente puede rechazar la propuesta." }, { status: 403 });
    const proposal = booking.proposals.find((item) => proposalIsActive(item));
    if (!proposal) return NextResponse.json({ error: "No hay una propuesta activa." }, { status: 409 });
    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "rejected", decidedAt: new Date() } });
    if (conversation) await prisma.message.create({ data: { conversationId: conversation.id, sender: "cliente", text: "❌ PROPUESTA RECHAZADA · El profesional ya puede enviar una nueva." } });
    return NextResponse.json({ ok: true });
  }

  if (action === "accept_proposal" || action === "aceptada") {
    if (viewer !== "cliente" || booking.status !== "requested") return NextResponse.json({ error: "No podés aceptar esta propuesta." }, { status: 409 });
    if (booking.professional.profileStatus !== "approved" || (booking.professional.user && booking.professional.user.accountStatus !== "approved")) return NextResponse.json({ error: "El oferente todavía no está habilitado para iniciar trabajos." }, { status: 409 });
    const proposal = booking.proposals.find((item) => proposalIsActive(item));
    if (!proposal) return NextResponse.json({ error: "La propuesta venció o ya no está disponible." }, { status: 409 });
    const updated = await prisma.$transaction(async (tx) => {
      const active = await tx.booking.count({ where: { professionalId: booking.professionalId, status: { in: ACTIVE_JOB_STATUSES } } });
      if (!hasJobCapacity(active)) throw new Error("CAPACITY");
      await tx.proposal.update({ where: { id: proposal.id }, data: { status: "accepted", decidedAt: new Date() } });
      return tx.booking.update({ where: { id }, data: { status: "in_progress", acceptedProposalId: proposal.id, quotedPrice: proposal.amount } });
    }).catch((error) => { if (error instanceof Error && error.message === "CAPACITY") return null; throw error; });
    if (!updated) return NextResponse.json({ error: "El profesional ya tiene tres trabajos en curso." }, { status: 409 });
    if (conversation) await prisma.message.create({ data: { conversationId: conversation.id, sender: "cliente", text: `✅ PROPUESTA ACEPTADA · ${messageText(proposal.amount)} · Trabajo en curso.` } });
    return NextResponse.json(updated);
  }

  if (action === "finish" || action === "completada") {
    if (viewer !== "profesional" || booking.status !== "in_progress") return NextResponse.json({ error: "Solo el oferente puede terminar un trabajo en curso." }, { status: 409 });
    const finalPrice = Math.round(Number(body?.finalPrice));
    const workSummary = typeof body?.workSummary === "string" ? body.workSummary.trim().slice(0, 1200) : "";
    if (!Number.isFinite(finalPrice) || finalPrice <= 0 || workSummary.length < 8) return NextResponse.json({ error: "Ingresá monto final y una explicación del trabajo." }, { status: 422 });
    if (!booking.professional.paymentAlias || !booking.professional.paymentCvu) return NextResponse.json({ error: "Configurá tu alias y CVU antes de terminar el trabajo." }, { status: 422 });
    const updated = await prisma.booking.update({ where: { id }, data: { status: "finished", finalPrice, workSummary, finishedAt: new Date() } });
    if (conversation) await prisma.message.create({ data: { conversationId: conversation.id, sender: "profesional", text: `🏁 TRABAJO TERMINADO · ${messageText(finalPrice)} · ${workSummary}` } });
    return NextResponse.json(updated);
  }

  if (action === "report_payment") {
    if (viewer !== "cliente" || booking.status !== "finished" || !booking.finalPrice) return NextResponse.json({ error: "El pago todavía no está habilitado." }, { status: 409 });
    if (!conversation) return NextResponse.json({ error: "No encontramos el hilo de esta contratación." }, { status: 409 });
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({ data: { amount: booking.finalPrice!, commission: 0, netAmount: booking.finalPrice!, provider: manualAliasProvider.key, status: "reported", reportedAt: new Date(), userId: booking.userId, professionalId: booking.professionalId, conversationId: conversation.id, bookingId: booking.id } });
      await tx.booking.update({ where: { id }, data: { status: "payment_reported", paymentReportedAt: new Date() } });
      return created;
    });
    if (conversation) await prisma.message.create({ data: { conversationId: conversation.id, sender: "cliente", text: "💸 PAGO INFORMADO · El profesional debe confirmar la recepción." } });
    return NextResponse.json(payment, { status: 201 });
  }

  if (action === "confirm_payment") {
    if (viewer !== "profesional" || booking.status !== "payment_reported") return NextResponse.json({ error: "No hay un pago informado para confirmar." }, { status: 409 });
    const payment = booking.payments.find((item) => item.status === "reported");
    if (!payment) return NextResponse.json({ error: "No hay un pago informado." }, { status: 409 });
    await prisma.$transaction([prisma.payment.update({ where: { id: payment.id }, data: { status: "pagado", paidAt: new Date(), confirmedAt: new Date() } }), prisma.booking.update({ where: { id }, data: { status: "paid_awaiting_review", paidAt: new Date() } })]);
    if (conversation) await prisma.message.create({ data: { conversationId: conversation.id, sender: "profesional", text: "✅ PAGO CONFIRMADO · El cliente ya puede calificar el trabajo." } });
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel" || action === "cancelada") {
    if (booking.status !== "requested") return NextResponse.json({ error: "Solo se puede cancelar antes de comenzar el trabajo." }, { status: 409 });
    await prisma.proposal.updateMany({ where: { bookingId: id, status: "pending" }, data: { status: "rejected", decidedAt: new Date() } });
    const updated = await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 422 });
}
