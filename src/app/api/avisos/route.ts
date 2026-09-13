import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const POR_PAGINA = 20;

/**
 * GET /api/avisos?cursor=<id>&sinLeer=1
 * Historial de avisos, de a veinte. El cursor es el id del último que ya se ve.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  const cursor = req.nextUrl.searchParams.get("cursor");
  const sinLeer = req.nextUrl.searchParams.get("sinLeer") === "1";
  const filas = await prisma.notification.findMany({
    where: { userId: user.id, ...(sinLeer ? { readAt: null } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: POR_PAGINA + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, kind: true, title: true, body: true, url: true, readAt: true, createdAt: true },
  });

  const hayMas = filas.length > POR_PAGINA;
  const items = filas.slice(0, POR_PAGINA).map((aviso) => ({ ...aviso, createdAt: aviso.createdAt.toISOString(), readAt: aviso.readAt?.toISOString() ?? null }));
  return NextResponse.json({ items, nextCursor: hayMas ? items[items.length - 1].id : null });
}

/**
 * DELETE /api/avisos  body: { id } | { todos: true }
 * Siempre filtrado por la persona: un id ajeno simplemente no borra nada.
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: unknown; todos?: unknown } | null;
  if (body?.todos === true) {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
  } else if (typeof body?.id === "string") {
    await prisma.notification.deleteMany({ where: { id: body.id, userId: user.id } });
  } else {
    return NextResponse.json({ error: "Decinos qué aviso borrar." }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
