import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sin exportar: un route handler solo puede exportar sus métodos y su config.
const REPORT_REASONS = ["no_es_suyo", "inapropiado", "enganoso", "otro"] as const;
const CHAT_REASONS = ["acoso", "estafa", "spam", "inapropiado", "otro"] as const;

/** Cuántos mensajes se congelan con la denuncia de un chat. */
const MENSAJES_DE_CONTEXTO = 30;

/**
 * POST /api/denuncias
 * Denuncia una imagen publicada como muestra de trabajo, o una conversación.
 *
 * Pide sesión con email verificado a propósito: una denuncia anónima no le
 * cuesta nada a nadie y el buzón de administración se llena de ruido.
 */
export async function POST(req: NextRequest) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const targetType = String(body?.targetType ?? "");
  const targetId = String(body?.targetId ?? "");
  const reason = String(body?.reason ?? "");
  const detail = String(body?.detail ?? "").trim().slice(0, 1000) || null;

  let objetivo: { url: string | null; userId: string | null; context: string | null } | null;

  if (targetType === "conversation") {
    if (!CHAT_REASONS.includes(reason as (typeof CHAT_REASONS)[number])) return NextResponse.json({ error: "Elegí un motivo." }, { status: 422 });
    if (reason === "otro" && !detail) return NextResponse.json({ error: "Contanos brevemente qué pasó." }, { status: 422 });

    const conversation = await prisma.conversation.findUnique({
      where: { id: targetId },
      select: {
        userId: true,
        professional: { select: { userId: true } },
        messages: { orderBy: { createdAt: "desc" }, take: MENSAJES_DE_CONTEXTO, select: { sender: true, text: true, attachmentUrl: true, createdAt: true } },
      },
    });
    if (!conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
    const soyCliente = conversation.userId === user.id;
    const soyPro = conversation.professional.userId === user.id;
    // Sólo se denuncia un chat del que sos parte: si no, cualquiera podría leer
    // (vía administración) conversaciones ajenas.
    if (!soyCliente && !soyPro) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });

    const context = JSON.stringify(
      conversation.messages.reverse().map((m) => ({ sender: m.sender, text: m.text, attachmentUrl: m.attachmentUrl, createdAt: m.createdAt })),
    );
    objetivo = { url: null, userId: soyCliente ? conversation.professional.userId : conversation.userId, context };
  } else if (targetType === "work_sample_image" || targetType === "work_photo") {
    if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) return NextResponse.json({ error: "Elegí un motivo." }, { status: 422 });
    if (reason === "otro" && !detail) return NextResponse.json({ error: "Contanos brevemente qué pasa con la imagen." }, { status: 422 });

    // La URL se guarda congelada en la denuncia: si después borran la muestra,
    // administración todavía tiene que poder ver qué fue lo que se denunció.
    objetivo = targetType === "work_sample_image"
      ? await prisma.workSampleImage.findUnique({ where: { id: targetId }, select: { url: true, sample: { select: { professional: { select: { userId: true } } } } } }).then((fila) => fila && { url: fila.url, userId: fila.sample.professional.userId, context: null })
      : await prisma.workPhoto.findUnique({ where: { id: targetId }, select: { url: true, professional: { select: { userId: true } } } }).then((fila) => fila && { url: fila.url, userId: fila.professional.userId, context: null });
    if (!objetivo) return NextResponse.json({ error: "La imagen no existe." }, { status: 404 });
  } else {
    return NextResponse.json({ error: "No sabemos qué estás denunciando." }, { status: 422 });
  }

  // Los perfiles del seed no tienen cuenta detrás: sin dueño no hay a quién revisarle nada.
  if (!objetivo.userId) return NextResponse.json({ error: "Del otro lado no hay una cuenta asociada." }, { status: 422 });
  if (objetivo.userId === user.id) return NextResponse.json({ error: "No podés denunciarte a vos." }, { status: 422 });

  try {
    await prisma.report.create({
      data: { targetType, targetId, imageUrl: objetivo.url, context: objetivo.context, reason, detail, reporterId: user.id, accusedId: objetivo.userId },
    });
  } catch (error) {
    // Una por persona y objetivo: insistir no le suma peso a la denuncia.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya hiciste esta denuncia. Administración la está revisando." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
