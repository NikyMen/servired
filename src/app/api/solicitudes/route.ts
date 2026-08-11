import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/solicitudes — crea una nueva solicitud de presupuesto
export async function POST(req: NextRequest) {
  // Con sesión: la solicitud tiene que tener dueño para que le puedan contestar.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Entrá para publicar una solicitud." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title, description, contactName, categorySlug, latitude, longitude } =
    (body ?? {}) as Record<string, unknown>;

  // Validación mínima
  const errors: string[] = [];
  if (typeof title !== "string" || title.trim().length < 4)
    errors.push("El título debe tener al menos 4 caracteres.");
  if (typeof description !== "string" || description.trim().length < 10)
    errors.push("Contanos un poco más: la descripción es muy corta.");
  if (typeof contactName !== "string" || contactName.trim().length < 2)
    errors.push("Ingresá tu nombre de contacto.");

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
  }

  let categoryId: string | null = null;
  if (typeof categorySlug === "string" && categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
    categoryId = cat?.id ?? null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  const created = await prisma.serviceRequest.create({
    data: {
      title: (title as string).trim(),
      description: (description as string).trim(),
      zone: "Corrientes",
      budget: null,
      latitude: Number.isFinite(lat) ? lat : -27.4692,
      longitude: Number.isFinite(lng) ? lng : -58.8306,
      contactName: (contactName as string).trim(),
      userId: user.id,
      categoryId,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
