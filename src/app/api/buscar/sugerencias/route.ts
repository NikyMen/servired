import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggest } from "@/lib/search";

export const dynamic = "force-dynamic";

// GET /api/buscar/sugerencias?q=... — autocompletado del buscador
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ suggestions: [] });

  const [pros, categories] = await Promise.all([
    prisma.professional.findMany({
      include: {
        category: { select: { slug: true, name: true } },
        services: { select: { title: true, description: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { createdAt: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
  ]);

  return NextResponse.json({ suggestions: suggest(pros, categories, q) });
}
