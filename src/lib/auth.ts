import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Sesiones con token opaco guardado en la base: se pueden revocar de verdad
 * (a diferencia de un JWT, que sigue valiendo hasta que expira).
 * El hasheo de contraseñas vive en src/lib/password.ts.
 */

const COOKIE_NAME = "servired_session";
const SESSION_DAYS = 30;

export type Role = "cliente" | "profesional";

export { hashPassword, verifyPassword } from "@/lib/password";

/** Solo se puede llamar desde un Server Action o Route Handler (escribe cookie). */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true, // fuera del alcance de document.cookie
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    // deleteMany y no delete: si el token ya no está, no queremos que tire error.
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor: string;
  /** Perfil público, solo si la cuenta es profesional. */
  professionalId: string | null;
};

/**
 * Usuario de la request actual, o null.
 * `cache` lo resuelve una sola vez por request aunque lo llamen varios componentes.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { professional: { select: { id: true } } } } },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "profesional" ? "profesional" : "cliente",
    avatarColor: user.avatarColor,
    professionalId: user.professional?.id ?? null,
  };
});

/**
 * Igual que getSessionUser pero corta el render y manda a /entrar.
 * `next` hace que después del login se vuelva a donde el usuario quería ir.
 */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  }
  return user;
}

/** Exige una cuenta profesional con perfil público creado. */
export async function requirePro(next?: string) {
  const user = await requireUser(next);
  if (user.role !== "profesional" || !user.professionalId) {
    redirect("/");
  }
  return user as SessionUser & { professionalId: string };
}
