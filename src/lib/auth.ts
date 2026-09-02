import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
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
  /** Foto de perfil, si subió una. */
  avatarUrl: string | null;
  /** Perfil público de Ofrezco, si completó el alta correspondiente. */
  professionalId: string | null;
  emailVerified: boolean;
  accountStatus: string;
  kycStatus: string;
  canInteract: boolean;
  professionalStatus: string | null;
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
    include: {
      user: {
        include: {
          professional: { select: { id: true, profileStatus: true } },
          kycCase: { select: { status: true } },
        },
      },
    },
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
    avatarUrl: user.avatarUrl,
    professionalId: user.professional?.id ?? null,
    emailVerified: user.emailVerifiedAt != null,
    accountStatus: user.accountStatus,
    kycStatus: user.kycCase?.status ?? "draft",
    canInteract: user.emailVerifiedAt != null && user.accountStatus === "approved",
    professionalStatus: user.professional?.profileStatus ?? null,
  };
});

export type InteractionAccess =
  | { user: SessionUser; error?: never; status?: never }
  | { user?: never; error: string; status: 401 | 403 };

/** Guard común para toda escritura social/comercial. */
export async function interactionAccess(): Promise<InteractionAccess> {
  const user = await getSessionUser();
  if (!user) return { error: "Entrá para continuar.", status: 401 };
  if (!user.canInteract) {
    return {
      error: "Tu cuenta todavía necesita verificación y aprobación.",
      status: 403,
    };
  }
  return { user };
}

/*
 * Acá vivían requireUser() y requirePro(), que cortaban el render y mandaban
 * a /entrar. Se fueron cuando la app pasó a poder recorrerse entera sin
 * cuenta: ninguna página bloquea ya. Lo que sigue exigiendo sesión es
 * ESCRIBIR, y eso lo resuelve cada route handler con getSessionUser() + 401,
 * que es donde tiene que estar: el rol sale de la sesión, nunca del body.
 */
