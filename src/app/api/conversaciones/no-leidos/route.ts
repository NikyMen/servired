import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resumenNoLeidos } from "@/lib/mensajes-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversaciones/no-leidos?como=pro
 *
 * Lo que consulta el globito del nav y del botón flotante cada pocos segundos.
 * Devuelve `total` (chats con algo sin leer, uno por chat) y el detalle por
 * conversación, que el chat usa para marcar cada hilo de la lista.
 *
 * Los avisos de la campanita viajan en el mismo pedido a propósito: ya corren
 * tres relojes en la pantalla (mensajes 5 s, este 12 s, acuerdo 5 s) y sumar un
 * cuarto para la campanita era repetir el viaje sin necesidad.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  // Sin sesión no hay globito, pero tampoco es un error: se responde en cero
  // para que el poll del cliente no tenga que distinguir casos.
  if (!user) return NextResponse.json({ total: 0, porConversacion: {}, avisos: { total: 0, items: [] } });

  const comoPro = req.nextUrl.searchParams.get("como") === "pro";
  const [resumen, avisos, sinLeer] = await Promise.all([
    resumenNoLeidos(comoPro ? "profesional" : "cliente", { userId: user.id, professionalId: user.professionalId }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, kind: true, title: true, body: true, url: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return NextResponse.json({
    ...resumen,
    avisos: {
      total: sinLeer,
      items: avisos.map((aviso) => ({ ...aviso, createdAt: aviso.createdAt.toISOString(), readAt: aviso.readAt?.toISOString() ?? null })),
    },
  });
}
