import { NextRequest, NextResponse } from "next/server";
import { marcarLeida, participantIn, resumenNoLeidos } from "@/lib/mensajes-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversaciones/[id]/leido — el que mira abrió el hilo.
 *
 * Devuelve el resumen ya recalculado para que el globito baje en el mismo
 * viaje, sin esperar al próximo poll.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);

  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  // Mismo 404 que si no existiera: no confirmamos la existencia de hilos ajenos.
  if (!conversation || !role) {
    return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  }

  await marcarLeida(conversation, role);

  const resumen = await resumenNoLeidos(role, {
    userId: user.id,
    professionalId: user.professionalId,
  });

  return NextResponse.json(resumen);
}
