"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

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

function homeFor(role: string): string {
  return role === "profesional" ? "/pro" : "/";
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
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect(next ?? homeFor(user.role)); // redirect() lanza: va afuera de todo try
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "profesional" ? "profesional" : "cliente";

  if (name.length < 2) return { error: "Decinos tu nombre.", field: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ese email no parece válido.", field: "email" };
  }
  if (password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres.", field: "password" };
  }

  // Datos extra del perfil público: solo aplican al que ofrece servicios.
  const headline = String(formData.get("headline") ?? "").trim();
  const zone = String(formData.get("zone") ?? "").trim();
  const categorySlug = String(formData.get("categoria") ?? "").trim();
  const priceFromRaw = String(formData.get("priceFrom") ?? "").trim();

  let categoryId: string | null = null;
  let priceFrom = 0;

  if (role === "profesional") {
    if (headline.length < 3) {
      return { error: "Escribí a qué te dedicás, por ejemplo “Plomero matriculado”.", field: "headline" };
    }
    if (zone.length < 2) return { error: "Decinos en qué zona trabajás.", field: "zone" };

    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) return { error: "Elegí un rubro.", field: "categoria" };
    categoryId = category.id;

    const parsed = Number(priceFromRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "El precio desde tiene que ser un número.", field: "priceFrom" };
    }
    priceFrom = Math.round(parsed);
  }

  const passwordHash = await hashPassword(password);
  const avatarColor = role === "profesional" ? "#059669" : "#2563eb";

  let user;
  try {
    // Transacción: si falla el perfil, no queda una cuenta profesional huérfana
    // sin perfil, que después rebota para siempre en /pro.
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, name, role, avatarColor },
      });

      if (role === "profesional" && categoryId) {
        await tx.professional.create({
          data: {
            name,
            headline,
            zone,
            priceFrom,
            categoryId,
            userId: created.id,
            avatarColor,
            bio: null,
          },
        });
      }
      return created;
    });
  } catch (e) {
    // P2002 = choque de unique. Dos personas mandando el form a la vez llegan acá.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una cuenta con ese email. Probá entrar.", field: "email" };
    }
    throw e;
  }

  await createSession(user.id);
  redirect(homeFor(role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/entrar");
}
