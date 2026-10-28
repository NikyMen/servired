import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, pendienteDeAlta } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePaymentHandle } from "@/lib/kyc";

/**
 * El cobro por transferencia del oferente: su CVU/CBU o alias y el titular de
 * la cuenta. Va aparte de /api/perfil porque se guarda solo, desde su tarjeta,
 * como la vinculación de Mercado Pago.
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entrá para editar tu perfil." }, { status: 401 });
  const pendiente = pendienteDeAlta(user);
  if (pendiente) return NextResponse.json({ error: pendiente }, { status: 403 });
  if (!user.professionalId || user.professionalStatus !== "approved") return NextResponse.json({ error: "Tu perfil profesional todavía no fue aprobado." }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  if (body.borrar === true) {
    // Con un trabajo esperando la transferencia, el cliente se quedaría sin a dónde pagar.
    const esperando = await prisma.booking.count({ where: { professionalId: user.professionalId, status: "finished" } });
    const mercadoPago = await prisma.mercadoPagoAccount.findUnique({ where: { professionalId: user.professionalId }, select: { professionalId: true } });
    if (esperando > 0 && !mercadoPago) return NextResponse.json({ error: "Tenés trabajos esperando el pago: cambiá el dato en vez de borrarlo." }, { status: 409 });
    await prisma.professional.update({ where: { id: user.professionalId }, data: { paymentHandle: null, paymentHandleKind: null, paymentHolder: null } });
    return NextResponse.json({ ok: true });
  }

  const handle = parsePaymentHandle(typeof body.handle === "string" ? body.handle : "");
  if (!handle) return NextResponse.json({ error: "Revisá el dato: un CVU o CBU de 22 dígitos, o un alias de 6 a 20 letras, números o puntos." }, { status: 422 });
  if (handle.kind === "alias" && handle.handle.length > 20) return NextResponse.json({ error: "Un alias tiene hasta 20 caracteres. Revisá que esté bien copiado." }, { status: 422 });
  const holder = typeof body.holder === "string" ? body.holder.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (holder.length < 3) return NextResponse.json({ error: "Escribí el nombre del titular de la cuenta, como figura en el banco." }, { status: 422 });
  // Cambiar de banco con un trabajo esperando el pago es válido, pero el cliente se entera por el chat.
  const antes = await prisma.professional.findUnique({ where: { id: user.professionalId }, select: { paymentHandle: true } });
  await prisma.professional.update({ where: { id: user.professionalId }, data: { paymentHandle: handle.handle, paymentHandleKind: handle.kind, paymentHolder: holder } });
  if (antes?.paymentHandle && antes.paymentHandle !== handle.handle) {
    const esperando = await prisma.booking.findMany({ where: { professionalId: user.professionalId, status: "finished" }, select: { userId: true } });
    const conversaciones = await prisma.conversation.findMany({ where: { professionalId: user.professionalId, userId: { in: esperando.map((b) => b.userId) } }, select: { id: true } });
    if (conversaciones.length) await prisma.message.createMany({ data: conversaciones.map((c) => ({ conversationId: c.id, sender: "profesional", text: "🏦 CAMBIÓ EL DATO DE COBRO · Si vas a transferir, usá el que figura ahora en el acuerdo." })) });
  }
  return NextResponse.json({ ...handle, holder });
}
