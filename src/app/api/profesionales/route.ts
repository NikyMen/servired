import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// GET /api/profesionales?categoria=&q=&ubicacion=&orden=&featured=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const categoria = sp.get("categoria")?.trim();
  const q = sp.get("q")?.trim();
  const ubicacion = sp.get("ubicacion")?.trim();
  const orden = sp.get("orden")?.trim() ?? "relevancia";
  const featured = sp.get("featured");

  const where: Prisma.ProfessionalWhereInput = {};

  if (categoria) where.category = { slug: categoria };
  if (featured === "true") where.featured = true;
  if (ubicacion) where.zone = { contains: ubicacion };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { headline: { contains: q } },
      { bio: { contains: q } },
      { services: { some: { title: { contains: q } } } },
      { category: { name: { contains: q } } },
    ];
  }

  const orderBy:
    | Prisma.ProfessionalOrderByWithRelationInput
    | Prisma.ProfessionalOrderByWithRelationInput[] =
    orden === "precio"
      ? { priceFrom: "asc" }
      : orden === "opiniones"
        ? { reviewsCount: "desc" }
        : orden === "calificacion"
          ? { rating: "desc" }
          : [{ featured: "desc" }, { rating: "desc" }];

  const professionals = await prisma.professional.findMany({
    where,
    orderBy,
    include: { category: true },
  });

  return NextResponse.json(
    professionals.map((p) => ({
      id: p.id,
      name: p.name,
      headline: p.headline,
      category: { slug: p.category.slug, name: p.category.name, icon: p.category.icon },
      avatarColor: p.avatarColor,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      zone: p.zone,
      priceFrom: p.priceFrom,
      verified: p.verified,
      featured: p.featured,
      yearsExperience: p.yearsExperience,
    }))
  );
}
