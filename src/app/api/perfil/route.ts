import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_URL } from "@/lib/uploads";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entrá para editar tu perfil." }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const avatarUrl = typeof body.avatarUrl === "string" && UPLOAD_URL.test(body.avatarUrl) ? body.avatarUrl : null;
  if (name.length < 2) return NextResponse.json({ error: "Ingresá tu nombre." }, { status: 422 });

  await prisma.user.update({ where: { id: user.id }, data: { name, avatarUrl } });
  if (user.professionalId) {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : undefined;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: "Marcá una ubicación válida." }, { status: 422 });
    if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) return NextResponse.json({ error: "El rubro no existe." }, { status: 422 });
    await prisma.professional.update({
      where: { id: user.professionalId },
      data: {
        name, avatarUrl, businessName: String(body.businessName ?? "").trim().slice(0, 100) || null,
        headline: String(body.headline ?? "").trim().slice(0, 100), bio: String(body.bio ?? "").trim().slice(0, 1200) || null,
        address: String(body.address ?? "").trim().slice(0, 180) || "Corrientes, Argentina", zone: "Corrientes",
        latitude, longitude, ...(categoryId ? { categoryId } : {}),
      },
    });
  }
  return NextResponse.json({ ok: true });
}

