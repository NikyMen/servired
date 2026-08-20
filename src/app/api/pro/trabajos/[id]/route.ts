import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/pro/trabajos/[id] — edita el título y la descripción propios
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.professionalId) {
    return NextResponse.json({ error: "Entrá con tu cuenta profesional." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 400) : "";
  if (title.length < 3) return NextResponse.json({ error: "El título es demasiado corto." }, { status: 422 });

  const result = await prisma.workPhoto.updateMany({
    where: { id, professionalId: user.professionalId },
    data: { title, description: description || null },
  });
  if (result.count === 0) return NextResponse.json({ error: "Ese trabajo no está en tu perfil." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/pro/trabajos/[id] — saca una foto de la galería
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.professionalId) {
    return NextResponse.json({ error: "Entrá con tu cuenta profesional." }, { status: 401 });
  }

  const { id } = await params;

  // deleteMany con el perfil de la sesión en el where: si la foto es de otro,
  // borra 0 filas en vez de tirar error, y de paso no revela que existe.
  const { count } = await prisma.workPhoto.deleteMany({
    where: { id, professionalId: user.professionalId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Esa foto no está en tu perfil." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
