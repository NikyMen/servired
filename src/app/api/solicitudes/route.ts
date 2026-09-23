import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { interactionAccess } from "@/lib/auth";
import { REQUEST_TTL_MS } from "@/lib/solicitudes";
import { notificarA } from "@/lib/notificaciones";
import { mandarAviso } from "@/lib/avisos-correo";
import { calificacionPendiente, MENSAJE_CALIFICACION_PENDIENTE } from "@/lib/calificacion";

export const dynamic = "force-dynamic";

// POST /api/solicitudes — crea una nueva solicitud de presupuesto
export async function POST(req: NextRequest) {
  // Con sesión: la solicitud tiene que tener dueño para que le puedan contestar.
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;
  const pendienteCalificar = await calificacionPendiente(user.id);
  if (pendienteCalificar) return NextResponse.json({ error: MENSAJE_CALIFICACION_PENDIENTE }, { status: 409 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title, description, categorySlug, latitude, longitude } =
    (body ?? {}) as Record<string, unknown>;

  // Validación mínima
  const errors: string[] = [];
  if (typeof title !== "string" || title.trim().length < 4)
    errors.push("El título debe tener al menos 4 caracteres.");
  if (typeof description !== "string" || description.trim().length < 10)
    errors.push("Contanos un poco más: la descripción es muy corta.");
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
  }

  let categoryId: string | null = null;
  if (typeof categorySlug === "string" && categorySlug) {
    const cat = await prisma.category.findFirst({ where: { slug: categorySlug, approvalStatus: "approved", parentId: { not: null } }, select: { id: true } });
    if (!cat) return NextResponse.json({ error: "Elegí un rubro habilitado." }, { status: 422 });
    categoryId = cat.id;
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
      contactName: user.name,
      userId: user.id,
      categoryId,
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
    },
  });

  /* Aviso a los oferentes del rubro. Se corta en 50 porque cada uno es una
     fila: con un rubro muy poblado esto pide otra estrategia (un digest, o
     calcularlo al abrir la campanita) antes que una escritura por cabeza. */
  if (categoryId) {
    const interesados = await prisma.professional.findMany({
      where: { profileStatus: "approved", userId: { not: null }, user: { accountStatus: "approved" }, categoryLinks: { some: { categoryId } } },
      select: { userId: true },
      take: 50,
    });
    await notificarA(prisma, interesados.map((pro) => pro.userId!).filter((id) => id !== user.id), {
      kind: "solicitud",
      title: "Nueva solicitud en tu rubro",
      body: created.title,
      url: "/pro/solicitudes",
    });
    /* Por correo va a todos los del rubro, sin el corte de la campanita:
       sale una sola vez, al publicar, y cada uno puede apagarlo. */
    const rubroId = categoryId;
    after(async () => {
      const [rubro, pros] = await Promise.all([
        prisma.category.findUnique({ where: { id: rubroId }, select: { name: true } }),
        prisma.professional.findMany({
          where: { profileStatus: "approved", userId: { not: null }, user: { accountStatus: "approved" }, categoryLinks: { some: { categoryId: rubroId } } },
          select: { userId: true },
        }),
      ]);
      const nombre = rubro?.name ?? "tu rubro";
      for (const pro of pros) {
        if (!pro.userId || pro.userId === user.id) continue;
        await mandarAviso(pro.userId, "solicitudes", { asunto: `Nueva solicitud de ${nombre} en ${created.zone}`, titulo: created.title, texto: `Publicaron una solicitud de ${nombre} en ${created.zone}. Si te interesa, respondé antes de que la tome otro.`, url: "/pro/solicitudes", boton: "Ver solicitud" });
      }
    });
  }

  return NextResponse.json(created, { status: 201 });
}
