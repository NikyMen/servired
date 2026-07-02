import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categorias — lista de categorías con cantidad de profesionales
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { professionals: true } } },
  });

  return NextResponse.json(
    categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      count: c._count.professionals,
    }))
  );
}
