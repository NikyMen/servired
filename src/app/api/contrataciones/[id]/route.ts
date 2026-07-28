import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Qué puede hacer cada lado, según el estado actual.
 *
 * El rol sale de la sesión comparada contra la contratación, no de lo que diga
 * el navegador: solo el profesional acepta o completa, y cancelar puede cualquiera
 * de los dos.
 */
const TRANSITIONS: Record<"cliente" | "profesional", Record<string, string[]>> = {
  cliente: {
    solicitada: ["cancelada"],
    presupuestada: ["aceptada", "cancelada"],
    aceptada: ["cancelada"],
  },
  profesional: {
    solicitada: ["presupuestada", "cancelada"],
    aceptada: ["completada", "cancelada"],
  },
};

// PATCH /api/contrataciones/[id] — cambia el estado de una contratación
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { status, finalPrice, quotedPrice, workSummary } = (body ?? {}) as Record<string, unknown>;
  if (typeof status !== "string") {
    return NextResponse.json({ error: "Falta el estado." }, { status: 422 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { professional: { select: { userId: true } } },
  });
  if (!booking) {
    return NextResponse.json({ error: "La contratación no existe." }, { status: 404 });
  }

  // ¿De qué lado de esta contratación está quien pide el cambio?
  let role: "cliente" | "profesional" | null = null;
  if (booking.userId === user.id) role = "cliente";
  else if (booking.professional.userId && booking.professional.userId === user.id) {
    role = "profesional";
  }
  // Mismo 404 que si no existiera: no confirmamos contrataciones ajenas.
  if (!role) {
    return NextResponse.json({ error: "La contratación no existe." }, { status: 404 });
  }

  if (!TRANSITIONS[role][booking.status]?.includes(status)) {
    return NextResponse.json(
      { error: `No podés pasar esta contratación de "${booking.status}" a "${status}".` },
      { status: 422 }
    );
  }

  const data: { status: string; finalPrice?: number; quotedPrice?: number; workSummary?: string } = { status };
  if (status === "presupuestada") {
    const amount = Number(quotedPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Ingresá un presupuesto válido." }, { status: 422 });
    }
    data.quotedPrice = Math.round(amount);
  }
  if (status === "completada") {
    const amount = Number(finalPrice);
    const summary = typeof workSummary === "string" ? workSummary.trim() : "";
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Falta el monto final del trabajo." }, { status: 422 });
    }
    if (summary.length < 8) {
      return NextResponse.json({ error: "Falta una breve explicación del trabajo." }, { status: 422 });
    }
    data.finalPrice = Math.round(amount);
    data.workSummary = summary;
  }

  const updated = await prisma.booking.update({ where: { id }, data });
  return NextResponse.json(updated);
}
