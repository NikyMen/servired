import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/**
 * Alta a medio hacer: la persona se registró con email + contraseña pero
 * todavía no confirmó el código. NO tiene sesión — sigue siendo un invitado —
 * hasta que verifica. Lo único que la ata a ese User a medio crear es esta
 * cookie firmada de vida corta; si la abandona, no queda nada logueado.
 */

const COOKIE = "servired_pending_verify";
const TTL_S = 60 * 60; // 1 h, igual que el TTL de servired_after_verify

function secret() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET || "servired-dev-email";
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

function sigMatches(userId: string, sig: string) {
  const expected = Buffer.from(sign(userId), "hex");
  const got = Buffer.from(sig, "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** Marca el alta a medio hacer de este usuario SIN darle sesión. */
export async function setPendingVerification(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_S,
  });
}

export async function clearPendingVerification() {
  (await cookies()).delete(COOKIE);
}

/** userId del alta a medio hacer, validado contra la firma y contra la base. */
export async function getPendingVerificationUserId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, sig] = raw.split(".");
  if (!userId || !sig || !sigMatches(userId, sig)) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt) return null; // ya no existe o ya está verificado: la cookie sobra
  return userId;
}

/**
 * A quién le corresponde una acción de verificación de email: si hay sesión,
 * ese usuario; si no, el alta a medio hacer de la cookie. `pending` dice si
 * todavía falta crearle la sesión al confirmar.
 */
export async function verificationUserId(): Promise<{ userId: string; pending: boolean } | null> {
  const user = await getSessionUser();
  if (user) return { userId: user.id, pending: false };
  const pendingId = await getPendingVerificationUserId();
  return pendingId ? { userId: pendingId, pending: true } : null;
}
