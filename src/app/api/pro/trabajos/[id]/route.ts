import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;
  if (!user.professionalId || user.professionalStatus !== "approved") return NextResponse.json({ error: "Necesitás un perfil profesional aprobado." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 600) : "";
  if (title.length < 3) return NextResponse.json({ error: "El título es demasiado corto." }, { status: 422 });
  const result = await prisma.workSample.updateMany({ where: { id, professionalId: user.professionalId }, data: { title, description: description || null } });
  if (!result.count) return NextResponse.json({ error: "La muestra no está en tu perfil." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;
  if (!user.professionalId || user.professionalStatus !== "approved") return NextResponse.json({ error: "Necesitás un perfil profesional aprobado." }, { status: 403 });
  const { id } = await params;
  const result = await prisma.workSample.deleteMany({ where: { id, professionalId: user.professionalId } });
  if (!result.count) return NextResponse.json({ error: "La muestra no está en tu perfil." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
