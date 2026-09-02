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
  const kind = text(formData, "kind") === "profesional" ? "profesional" : "oficio";
  await prisma.category.create({ data: { name, slug, icon: text(formData, "icon") || "🛠️", parentId, kind } });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const current = id ? await prisma.category.findUnique({ where: { id }, select: { parentId: true } }) : null;
  const parentId = formData.has("parentId") ? text(formData, "parentId") || null : current?.parentId || null;
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
    data: { name: text(formData, "name"), slug: slugify(text(formData, "slug") || text(formData, "name")), icon: text(formData, "icon") || "🛠️", parentId, kind: text(formData, "kind") === "profesional" ? "profesional" : "oficio" },
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

export async function reviewKycAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const action = text(formData, "action");
  const reason = text(formData, "reason").slice(0, 1000);
  if (!id || !["approve", "changes", "reject"].includes(action)) return;
  if ((action === "changes" || action === "reject") && reason.length < 5) return;
  const kyc = await prisma.kycCase.findUnique({ where: { id }, include: { user: { include: { professional: { include: { categoryLinks: true } } } } } });
  if (!kyc) return;
  const reviewer = process.env.ADMIN_EMAIL || "admin";
  await prisma.$transaction(async (tx) => {
    if (action === "approve") {
      if (kyc.user.professional) {
        const categoryIds = kyc.user.professional.categoryLinks.map((link) => link.categoryId);
        await tx.category.updateMany({ where: { id: { in: categoryIds }, approvalStatus: "pending", createdByUserId: kyc.userId }, data: { approvalStatus: "approved" } });
        await tx.professional.update({ where: { id: kyc.user.professional.id }, data: { profileStatus: "approved", verified: true } });
      }
      await tx.kycCase.update({ where: { id }, data: { status: "approved", reviewReason: null, reviewedBy: reviewer, reviewedAt: new Date() } });
      if (kyc.user.accountStatus !== "suspended") await tx.user.update({ where: { id: kyc.userId }, data: { accountStatus: "approved" } });
    } else {
      const status = action === "changes" ? "changes_requested" : "rejected";
      await tx.kycCase.update({ where: { id }, data: { status, reviewReason: reason, reviewedBy: reviewer, reviewedAt: new Date() } });
      if (kyc.user.professional) await tx.professional.update({ where: { id: kyc.user.professional.id }, data: { profileStatus: status, verified: false } });
    }
  });
  revalidatePath("/admin");
  revalidatePath("/");
}
