"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { issueEmailVerification } from "@/lib/email-verification";

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

  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash, name, role: "cliente", avatarColor: "#2563eb", accountStatus: "email_pending" },
    });
  } catch (e) {
    // P2002 = choque de unique. Dos personas mandando el form a la vez llegan acá.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una cuenta con ese email. Probá entrar.", field: "email" };
    }
    throw e;
  }

  await createSession(user.id);
  if (next) (await cookies()).set("servired_after_verify", next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  await issueEmailVerification(user.id);
  redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}

export async function logoutAction() {
  await destroySession();
  redirect("/entrar");
}
