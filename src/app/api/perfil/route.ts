import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, pendienteDeAlta } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_URL } from "@/lib/uploads";
import { validPhone } from "@/lib/kyc";
import { zonaDe } from "@/lib/localidades";
import { leerZona } from "@/lib/geo";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entrá para editar tu perfil." }, { status: 401 });
  if (!user.canInteract) return NextResponse.json({ error: "Completá y aprobá tu verificación antes de editar el perfil." }, { status: 403 });
  const pendiente = pendienteDeAlta(user);
  if (pendiente) return NextResponse.json({ error: pendiente }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const rawAvatar = body.avatarUrl;
  const avatarUrl = rawAvatar === null ? null : typeof rawAvatar === "string" && (UPLOAD_URL.test(rawAvatar) || rawAvatar === user.avatarUrl) ? rawAvatar : undefined;
  if (name.length < 2) return NextResponse.json({ error: "Ingresá tu nombre." }, { status: 422 });
  if (avatarUrl === undefined) return NextResponse.json({ error: "La foto de perfil no es válida." }, { status: 422 });

  // Sin datos de Ofrezco (el Mi perfil de la cuenta) solo cambian el nombre y la foto.
  if (!user.professionalId || !("headline" in body)) {
    if (user.professionalId) {
      const pro = await prisma.professional.findUnique({ where: { id: user.professionalId }, select: { name: true } });
      if (pro && name !== pro.name) return NextResponse.json({ error: "El nombre legal se cambia desde la nueva verificación KYC." }, { status: 409 });
      await prisma.professional.update({ where: { id: user.professionalId }, data: { avatarUrl } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { name, avatarUrl } });
    return NextResponse.json({ ok: true });
  }

  const professional = await prisma.professional.findUnique({ where: { id: user.professionalId }, select: { providerType: true, name: true, categoryId: true, categoryLinks: { select: { categoryId: true, category: { select: { approvalStatus: true, kind: true, parentId: true } } } } } });
  if (!professional) return NextResponse.json({ error: "El perfil no existe." }, { status: 404 });
  if (user.professionalStatus !== "approved") return NextResponse.json({ error: "El perfil todavía no está aprobado." }, { status: 403 });
  if (name !== professional.name) return NextResponse.json({ error: "El nombre legal se cambia desde la nueva verificación KYC." }, { status: 409 });
  // Zona de trabajo opcional: sin marcar, el mapa usa el punto de su localidad.
  const zona = leerZona(body.latitude, body.longitude);
  const categoryIds = Array.isArray(body.categoryIds) ? [...new Set(body.categoryIds.filter((id): id is string => typeof id === "string"))] : [];
  const requestedCategories = categoryIds.length ? categoryIds : typeof body.categoryId === "string" ? [body.categoryId] : [];
  if (zona === undefined) return NextResponse.json({ error: "La zona marcada en el mapa no es válida." }, { status: 422 });
  /* Los rubros vinculados que el formulario no muestra (propuestos todavía sin
     aprobar, deshabilitados o de otro tipo) no se pueden destildar: se
     conservan tal cual y no traban el guardado. Solo se reemplazan los visibles. */
  const ocultos = professional.categoryLinks
    .filter(({ category }) => !(category.approvalStatus === "approved" && category.kind === professional.providerType && category.parentId !== null))
    .map((link) => link.categoryId);
  const pedidos = requestedCategories.filter((id) => !ocultos.includes(id));
  const validCategories = await prisma.category.findMany({ where: { id: { in: pedidos }, approvalStatus: "approved", kind: professional.providerType, parentId: { not: null } }, select: { id: true } });
  // findMany no respeta el orden pedido, y el primero es el rubro principal.
  validCategories.sort((a, b) => pedidos.indexOf(a.id) - pedidos.indexOf(b.id));
  if (validCategories.length !== pedidos.length || (!validCategories.length && !ocultos.length)) return NextResponse.json({ error: "Elegí al menos un rubro válido." }, { status: 422 });
  const categoryId = validCategories[0]?.id ?? (ocultos.includes(professional.categoryId) ? professional.categoryId : ocultos[0]);
  const headline = String(body.headline ?? "").trim().slice(0, 100);
  const bio = String(body.bio ?? "").trim().slice(0, 1200);
  if (headline.length < 3 || bio.length < 20) return NextResponse.json({ error: "Completá la actividad y una descripción de al menos 20 caracteres." }, { status: 422 });
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  if (!validPhone(phone)) return NextResponse.json({ error: "Ingresá un teléfono de contacto válido." }, { status: 422 });
  const yearsExperience = Math.trunc(Number(body.yearsExperience ?? 0));
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 60) return NextResponse.json({ error: "Los años en el oficio tienen que estar entre 0 y 60." }, { status: 422 });
  const localidad = user.localityId ? await prisma.locality.findUnique({ where: { id: user.localityId }, select: { name: true, province: true } }) : null;
  await prisma.$transaction(async (tx) => {
    await tx.professional.update({ where: { id: user.professionalId! }, data: {
      name, avatarUrl, businessName: String(body.businessName ?? "").trim().slice(0, 100) || null,
      headline, bio,
      // La zona sale de la localidad de la cuenta; si todavía no tiene, queda la que había.
      address: String(body.address ?? "").trim().slice(0, 180) || "Corrientes, Argentina", ...(localidad ? { zone: zonaDe(localidad) } : {}),
      phone, yearsExperience,
      latitude: zona?.lat ?? null, longitude: zona?.lng ?? null, categoryId,
    } });
    await tx.professionalCategory.deleteMany({ where: { professionalId: user.professionalId!, categoryId: { notIn: ocultos } } });
    if (validCategories.length) await tx.professionalCategory.updateMany({ where: { professionalId: user.professionalId! }, data: { isPrimary: false } });
    await tx.professionalCategory.createMany({ data: validCategories.map((category, index) => ({ professionalId: user.professionalId!, categoryId: category.id, isPrimary: index === 0 })) });
    await tx.user.update({ where: { id: user.id }, data: { name, avatarUrl } });
  });
  return NextResponse.json({ ok: true });
}
