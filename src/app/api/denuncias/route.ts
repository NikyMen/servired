import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const REPORT_REASONS = ["no_es_suyo", "inapropiado", "enganoso", "otro"] as const;

/**
 * POST /api/denuncias
 * Denuncia una imagen publicada como muestra de trabajo.
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

  if (targetType !== "work_sample_image" && targetType !== "work_photo") return NextResponse.json({ error: "No sabemos qué estás denunciando." }, { status: 422 });
  if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) return NextResponse.json({ error: "Elegí un motivo." }, { status: 422 });
  if (reason === "otro" && !detail) return NextResponse.json({ error: "Contanos brevemente qué pasa con la imagen." }, { status: 422 });

  // La URL se guarda congelada en la denuncia: si después borran la muestra,
  // administración todavía tiene que poder ver qué fue lo que se denunció.
  const objetivo = targetType === "work_sample_image"
    ? await prisma.workSampleImage.findUnique({ where: { id: targetId }, select: { url: true, sample: { select: { professional: { select: { userId: true } } } } } }).then((fila) => fila && { url: fila.url, userId: fila.sample.professional.userId })
    : await prisma.workPhoto.findUnique({ where: { id: targetId }, select: { url: true, professional: { select: { userId: true } } } }).then((fila) => fila && { url: fila.url, userId: fila.professional.userId });

  if (!objetivo) return NextResponse.json({ error: "La imagen no existe." }, { status: 404 });
  // Los perfiles del seed no tienen cuenta detrás: sin dueño no hay a quién revisarle nada.
  if (!objetivo.userId) return NextResponse.json({ error: "Esa imagen no tiene una cuenta asociada." }, { status: 422 });
  if (objetivo.userId === user.id) return NextResponse.json({ error: "Esa imagen es tuya." }, { status: 422 });

  try {
    await prisma.report.create({
      data: { targetType, targetId, imageUrl: objetivo.url, reason, detail, reporterId: user.id, accusedId: objetivo.userId },
    });
  } catch (error) {
    // Una por persona e imagen: insistir no le suma peso a la denuncia.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya denunciaste esta imagen. Administración la está revisando." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
