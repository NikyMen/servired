import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_URL } from "@/lib/uploads";
import { normalizeDigits, validCvu } from "@/lib/kyc";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entrá para editar tu perfil." }, { status: 401 });
  if (!user.canInteract) return NextResponse.json({ error: "Completá y aprobá tu verificación antes de editar el perfil." }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const rawAvatar = body.avatarUrl;
  const avatarUrl = rawAvatar === null ? null : typeof rawAvatar === "string" && (UPLOAD_URL.test(rawAvatar) || rawAvatar === user.avatarUrl) ? rawAvatar : undefined;
  if (name.length < 2) return NextResponse.json({ error: "Ingresá tu nombre." }, { status: 422 });
  if (avatarUrl === undefined) return NextResponse.json({ error: "La foto de perfil no es válida." }, { status: 422 });

  if (!user.professionalId) {
    await prisma.user.update({ where: { id: user.id }, data: { name, avatarUrl } });
    return NextResponse.json({ ok: true });
  }

  const professional = await prisma.professional.findUnique({ where: { id: user.professionalId }, select: { providerType: true, name: true } });
  if (!professional) return NextResponse.json({ error: "El perfil no existe." }, { status: 404 });
  if (user.professionalStatus !== "approved") return NextResponse.json({ error: "El perfil todavía no está aprobado." }, { status: 403 });
  if (name !== professional.name) return NextResponse.json({ error: "El nombre legal se cambia desde la nueva verificación KYC." }, { status: 409 });
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const categoryIds = Array.isArray(body.categoryIds) ? [...new Set(body.categoryIds.filter((id): id is string => typeof id === "string"))] : [];
  const requestedCategories = categoryIds.length ? categoryIds : typeof body.categoryId === "string" ? [body.categoryId] : [];
  const categoryId = requestedCategories[0];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: "Marcá una ubicación válida." }, { status: 422 });
  const validCategories = await prisma.category.findMany({ where: { id: { in: requestedCategories }, approvalStatus: "approved", kind: professional.providerType }, select: { id: true } });
  if (!categoryId || validCategories.length !== requestedCategories.length) return NextResponse.json({ error: "Elegí al menos un rubro válido." }, { status: 422 });
  const headline = String(body.headline ?? "").trim().slice(0, 100);
  const bio = String(body.bio ?? "").trim().slice(0, 1200);
  if (headline.length < 3 || bio.length < 20) return NextResponse.json({ error: "Completá la actividad y una descripción de al menos 20 caracteres." }, { status: 422 });
  const paymentAlias = String(body.paymentAlias ?? "").trim().slice(0, 80);
  const paymentCvu = normalizeDigits(String(body.paymentCvu ?? ""));
  if (paymentAlias.length < 6 || !validCvu(paymentCvu)) return NextResponse.json({ error: "Ingresá un alias y CVU válidos." }, { status: 422 });
  await prisma.$transaction(async (tx) => {
    await tx.professional.update({ where: { id: user.professionalId! }, data: {
      name, avatarUrl, businessName: String(body.businessName ?? "").trim().slice(0, 100) || null,
      headline, bio,
      address: String(body.address ?? "").trim().slice(0, 180) || "Corrientes, Argentina", zone: "Corrientes",
      paymentAlias, paymentCvu,
      latitude, longitude, categoryId,
    } });
    await tx.professionalCategory.deleteMany({ where: { professionalId: user.professionalId! } });
    await tx.professionalCategory.createMany({ data: validCategories.map((category, index) => ({ professionalId: user.professionalId!, categoryId: category.id, isPrimary: index === 0 })) });
    await tx.user.update({ where: { id: user.id }, data: { name, avatarUrl } });
  });
  return NextResponse.json({ ok: true });
}
