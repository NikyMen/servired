"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { issueEmailVerification } from "@/lib/email-verification";
import { setPendingVerification } from "@/lib/pending-verification";
import { consumePasswordReset, issuePasswordReset } from "@/lib/password-reset";

export type AuthState = { error?: string; field?: string } | undefined;

/**
 * Solo se acepta volver a una ruta interna.
 * Sin este filtro, /entrar?next=https://sitio-trucho.com redirigiría afuera
 * después de un login válido (open redirect). "//host" también sale del dominio.
 */
function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || !next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Completá email y contraseña." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Mismo mensaje exista o no la cuenta: si dijéramos "ese email no existe"
  // estaríamos regalando qué direcciones están registradas.
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos." };
  }

  // Cuenta sin verificar: no se entra. Se reanuda el alta a medio hacer (código
  // por email) y la persona sigue como invitado hasta que confirma el código.
  if (!user.emailVerifiedAt) {
    if (next) (await cookies()).set("servired_after_verify", next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
    await issueEmailVerification(user.id);
    await setPendingVerification(user.id);
    redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  // Suspendida no entra. Hasta ahora nada escribía ese estado, así que el
  // login nunca había tenido que contemplarlo; desde que se puede banear por
  // una denuncia, dejarla entrar sería suspenderla de mentira.
  if (user.accountStatus === "suspended") {
    return { error: "Tu cuenta está suspendida. Escribinos si creés que fue un error." };
  }

  const accountStatus = user.emailVerifiedAt && user.accountStatus !== "suspended" ? "approved" : user.accountStatus;
  if (accountStatus !== user.accountStatus) await prisma.user.update({ where: { id: user.id }, data: { accountStatus } });
  await createSession(user.id);
  redirect(accountStatus === "approved" ? (next ?? "/") : `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (name.length < 3 || name.split(/\s+/).length < 2) return { error: "Ingresá nombre y apellido.", field: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ese email no parece válido.", field: "email" };
  }
  if (password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres.", field: "password" };
  }

  const passwordHash = await hashPassword(password);

  // Ojo: acá NO se crea sesión. El alta queda "pendiente" (User en
  // email_pending + cookie firmada de vida corta) y la persona sigue navegando
  // como invitada. La sesión se crea recién cuando confirma el código en
  // /onboarding — ver src/lib/pending-verification.ts y el endpoint de verify.
  const pendingUserId = await createPendingUser({ email, passwordHash, name });
  if (typeof pendingUserId !== "string") return pendingUserId;

  if (next) (await cookies()).set("servired_after_verify", next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  await issueEmailVerification(pendingUserId);
  await setPendingVerification(pendingUserId);
  redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}

/**
 * Crea el User a medio hacer, o devuelve un AuthState con el error.
 * Si ya hay una fila con ese email pero nunca se verificó, no tiene dueño
 * todavía: se retoma con los datos nuevos en vez de rebotar.
 */
async function createPendingUser({ email, passwordHash, name }: { email: string; passwordHash: string; name: string }): Promise<string | AuthState> {
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: "cliente", avatarColor: "#2563eb", accountStatus: "email_pending" },
    });
    return user.id;
  } catch (e) {
    // P2002 = choque de unique (dos altas del mismo email a la vez, o una previa).
    if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !existing.emailVerifiedAt) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, role: "cliente", accountStatus: "email_pending" },
      });
      return existing.id;
    }
    return { error: "Ya existe una cuenta con ese email. Probá entrar.", field: "email" };
  }
}

/**
 * Pide el enlace para elegir una contraseña nueva.
 *
 * Siempre termina en la misma pantalla, exista o no la cuenta: igual que el
 * mensaje genérico del login, para no regalar qué emails están registrados.
 */
export async function requestPasswordResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribí un email válido.", field: "email" };
  }
  const result = await issuePasswordReset(email);
  if (!result.ok) return { error: result.error };
  redirect("/recuperar-clave?enviado=1");
}

/** Cambia la contraseña con el token del correo y deja la sesión abierta. */
export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres.", field: "password" };
  }
  const result = await consumePasswordReset(token, password);
  if (!result.ok) return { error: result.error };
  await createSession(result.userId);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/entrar");
}
