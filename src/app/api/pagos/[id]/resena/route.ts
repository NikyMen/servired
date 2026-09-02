import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_URL } from "@/lib/uploads";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!user.canInteract) return NextResponse.json({ error: "Tu cuenta todavía no fue aprobada." }, { status: 403 });
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { review: true } });
  if (!payment || payment.userId !== user.id) return NextResponse.json({ error: "El pago no existe." }, { status: 404 });
  if (payment.status !== "pagado") return NextResponse.json({ error: "La reseña se habilita después del pago." }, { status: 422 });
  if (payment.review) return NextResponse.json({ error: "Este pago ya tiene reseña." }, { status: 409 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const rating = Math.round(Number(body?.rating));
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 1000) : "";
  const imageUrl = typeof body?.imageUrl === "string" && UPLOAD_URL.test(body.imageUrl) ? body.imageUrl : null;
  if (rating < 1 || rating > 5 || comment.length < 5) return NextResponse.json({ error: "Elegí de 1 a 5 estrellas y escribí una opinión." }, { status: 422 });

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({ data: { authorName: user.name, rating, comment, imageUrl, userId: user.id, professionalId: payment.professionalId, bookingId: payment.bookingId, paymentId: payment.id, serviceTag: "Pago verificado" } });
    const aggregate = await tx.review.aggregate({ where: { professionalId: payment.professionalId }, _avg: { rating: true }, _count: true });
    await tx.professional.update({ where: { id: payment.professionalId }, data: { rating: aggregate._avg.rating ?? 0, reviewsCount: aggregate._count } });
    if (payment.bookingId) await tx.booking.update({ where: { id: payment.bookingId }, data: { status: "completed", completedAt: new Date() } });
    return created;
  });
  return NextResponse.json(review, { status: 201 });
}
