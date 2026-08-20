"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  isAdminConfigured,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export type AdminAuthState = { error?: string } | undefined;

export async function loginAdminAction(
  _previous: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  if (!isAdminConfigured()) {
    return { error: "Configurá ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_SESSION_SECRET en .env.local." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const configuredEmail = process.env.ADMIN_EMAIL!.trim().toLowerCase();

  if (email !== configuredEmail || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Email o contraseña incorrectos." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await destroyAdminSession();
  redirect("/admin/entrar");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeUrl(value: string) {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch { return null; }
}

export async function saveAdAction(formData: FormData) {
  await requireAdmin();
  const slot = text(formData, "slot");
  const title = text(formData, "title");
  if (!slot || !title) return;
  await prisma.ad.upsert({
    where: { slot },
    create: { slot, title, imageUrl: safeUrl(text(formData, "imageUrl")), linkUrl: safeUrl(text(formData, "linkUrl")), enabled: formData.get("enabled") === "on" },
    update: { title, imageUrl: safeUrl(text(formData, "imageUrl")), linkUrl: safeUrl(text(formData, "linkUrl")), enabled: formData.get("enabled") === "on" },
  });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  const parentId = text(formData, "parentId") || null;
  if (!name || !slug) return;
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent || parent.parentId) return;
  }
  await prisma.category.create({ data: { name, slug, icon: text(formData, "icon") || "🛠️", parentId } });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const parentId = text(formData, "parentId") || null;
  if (!id || parentId === id) return;
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent || parent.parentId) return;
  }
  let ancestorId = parentId;
  while (ancestorId) {
    if (ancestorId === id) return;
    const ancestor = await prisma.category.findUnique({ where: { id: ancestorId }, select: { parentId: true } });
    ancestorId = ancestor?.parentId || null;
  }
  await prisma.category.update({
    where: { id },
    data: { name: text(formData, "name"), slug: slugify(text(formData, "slug") || text(formData, "name")), icon: text(formData, "icon") || "🛠️", parentId },
  });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  const used = await prisma.category.findUnique({ where: { id }, select: { _count: { select: { professionals: true, requests: true } } } });
  const children = await prisma.category.count({ where: { parentId: id } });
  if (!used || used._count.professionals || used._count.requests || children) return;
  await prisma.category.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}
