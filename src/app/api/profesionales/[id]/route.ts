import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/profesionales/[id] — detalle de un profesional
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pro = await prisma.professional.findUnique({
    where: { id },
    include: {
      category: true,
      services: { orderBy: { createdAt: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      photos: true,
    },
  });

  if (!pro) {
    return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
  }

  return NextResponse.json(pro);
}
