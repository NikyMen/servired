import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE /api/pro/trabajos/[id] — saca una foto de la galería
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.professionalId) {
    return NextResponse.json({ error: "Entrá con tu cuenta profesional." }, { status: 401 });
  }

  const { id } = await params;

  // deleteMany con el perfil de la sesión en el where: si la foto es de otro,
  // borra 0 filas en vez de tirar error, y de paso no revela que existe.
  const { count } = await prisma.workPhoto.deleteMany({
    where: { id, professionalId: user.professionalId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Esa foto no está en tu perfil." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
