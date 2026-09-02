import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";
import { UPLOAD_URL } from "@/lib/uploads";

const MAX_SAMPLES = 24;
const MAX_IMAGES = 5;

export async function POST(req: NextRequest) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;
  if (!user.professionalId || user.professionalStatus !== "approved") return NextResponse.json({ error: "Necesitás un perfil profesional aprobado." }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const urls = Array.isArray(body?.urls) ? [...new Set(body.urls.filter((url): url is string => typeof url === "string" && UPLOAD_URL.test(url)))] : [];
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 600) : "";
  if (title.length < 3) return NextResponse.json({ error: "Poné un título de al menos 3 caracteres." }, { status: 422 });
  if (urls.length < 1 || urls.length > MAX_IMAGES) return NextResponse.json({ error: "Cada muestra necesita entre 1 y 5 fotos." }, { status: 422 });
  if (await prisma.workSample.count({ where: { professionalId: user.professionalId } }) >= MAX_SAMPLES) return NextResponse.json({ error: `Podés publicar hasta ${MAX_SAMPLES} muestras.` }, { status: 422 });
  const sample = await prisma.workSample.create({ data: { title, description: description || null, professionalId: user.professionalId, images: { create: urls.map((url, position) => ({ url, position })) } }, include: { images: { orderBy: { position: "asc" } } } });
  return NextResponse.json(sample, { status: 201 });
}
