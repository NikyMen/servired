import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const transitions: Record<string, string[]> = {
  solicitada: ["aceptada", "cancelada"],
  aceptada: ["completada", "cancelada"],
};

// PATCH /api/contrataciones/[id] — cambia el estado de una contratación
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { status } = (body ?? {}) as Record<string, unknown>;
  if (typeof status !== "string") {
    return NextResponse.json({ error: "Falta el estado." }, { status: 422 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "La contratación no existe." }, { status: 404 });
  }

  if (!transitions[booking.status]?.includes(status)) {
    return NextResponse.json(
      { error: `No se puede pasar de "${booking.status}" a "${status}".` },
      { status: 422 }
    );
  }

  const updated = await prisma.booking.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}
