import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSessionUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAccount } from "@/lib/baja-cuenta";

export const dynamic = "force-dynamic";

/**
 * POST /api/cuenta/baja
 * Borra la cuenta de quien la pide. No hay vuelta atrás.
 *
 * No usa `interactionAccess()` a propósito: una cuenta sin verificar o
 * suspendida también tiene derecho a borrarse.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Entrá para dar de baja tu cuenta." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  // Tipear el email es la confirmación; la contraseña, la prueba de identidad.
  // Las cuentas de Google o Facebook no tienen contraseña: ahí basta el email.
  if (email !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "El email no coincide con el de tu cuenta." }, { status: 422 });
  }
  const account = await prisma.user.findUnique({ where: { id: session.id }, select: { passwordHash: true } });
  if (account?.passwordHash && !(await verifyPassword(password, account.passwordHash))) {
    return NextResponse.json({ error: "La contraseña no es correcta." }, { status: 422 });
  }

  const result = await deleteAccount(session.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  await destroySession();
  return NextResponse.json({ ok: true });
}
