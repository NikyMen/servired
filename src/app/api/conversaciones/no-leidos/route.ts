import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resumenNoLeidos } from "@/lib/mensajes-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversaciones/no-leidos?como=pro
 *
 * Lo que consulta el globito del nav y del botón flotante cada pocos segundos.
 * Devuelve `total` (chats con algo sin leer, uno por chat) y el detalle por
 * conversación, que el chat usa para marcar cada hilo de la lista.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  // Sin sesión no hay globito, pero tampoco es un error: se responde en cero
  // para que el poll del cliente no tenga que distinguir casos.
  if (!user) return NextResponse.json({ total: 0, porConversacion: {} });

  const comoPro = req.nextUrl.searchParams.get("como") === "pro";
  const resumen = await resumenNoLeidos(comoPro ? "profesional" : "cliente", {
    userId: user.id,
    professionalId: user.professionalId,
  });

  return NextResponse.json(resumen);
}
