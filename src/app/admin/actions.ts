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
import { saveUpload } from "@/lib/uploads";
import { slugify } from "@/lib/format";
import { removeUpload } from "@/lib/uploads";
import { notificar } from "@/lib/notificaciones";

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

/**
 * Guarda un texto legal. Una fila por clave, con upsert, igual que las placas
 * de publicidad: la página lo lee por esa clave y cae al texto por defecto si
 * todavía no existe.
 */
export async function saveSiteTextAction(formData: FormData) {
  await requireAdmin();
  const slug = text(formData, "slug");
  const title = text(formData, "title").slice(0, 160);
  const body = String(formData.get("body") ?? "").trim().slice(0, 40000);
  if (!slug || !title || body.length < 20) return;
  await prisma.siteText.upsert({
    where: { slug },
    create: { slug, title, body },
    update: { title, body },
  });
  revalidatePath("/admin");
  revalidatePath(`/${slug}`);
}

export type ReportDecision = "dismiss" | "remove" | "ban";

/**
 * Resuelve una denuncia. La decisión viene bindeada como primer argumento:
 * un `<button name value>` dentro del form anda en desarrollo pero no en el
 * build de producción con React 19 (mismo caso que la revisión de KYC).
 */
export async function resolveReportAction(decision: ReportDecision, formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const resolution = text(formData, "resolution").slice(0, 500);
  if (!id) return;

  const report = await prisma.report.findUnique({ where: { id }, select: { id: true, status: true, targetType: true, targetId: true, reporterId: true, accusedId: true } });
  if (!report || report.status !== "pending") return;

  if (decision === "remove" || decision === "ban") {
    if (report.targetType === "work_sample_image") {
      const image = await prisma.workSampleImage.findUnique({ where: { id: report.targetId }, select: { url: true, sampleId: true } });
      if (image) {
        await prisma.workSampleImage.delete({ where: { id: report.targetId } });
        await removeUpload(image.url);
        // Una muestra sin imágenes no es una muestra de nada.
        const quedan = await prisma.workSampleImage.count({ where: { sampleId: image.sampleId } });
        if (quedan === 0) await prisma.workSample.delete({ where: { id: image.sampleId } }).catch(() => {});
      }
    } else {
      const photo = await prisma.workPhoto.findUnique({ where: { id: report.targetId }, select: { url: true } });
      if (photo) {
        await prisma.workPhoto.delete({ where: { id: report.targetId } });
        await removeUpload(photo.url);
      }
    }
  }

  if (decision === "ban") {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: report.accusedId }, data: { accountStatus: "suspended" } });
      // Se le cierran las sesiones abiertas: suspender y dejarla adentro no
      // suspende nada. Para esto sirve tener el token de sesión en la base.
      await tx.session.deleteMany({ where: { userId: report.accusedId } });
      await tx.professional.updateMany({ where: { userId: report.accusedId }, data: { profileStatus: "rejected", verified: false } });
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id },
      data: { status: decision === "dismiss" ? "dismissed" : "actioned", resolution: resolution || null, resolvedAt: new Date() },
    });
    await notificar(tx, report.reporterId, {
      kind: "denuncia",
      title: "Revisamos tu denuncia",
      body: decision === "dismiss" ? "Miramos la imagen y por ahora queda publicada." : "Dimos de baja la imagen que denunciaste. Gracias por avisar.",
      url: "/",
      groupKey: `report:${report.id}`,
    });
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

/** Deshace una suspensión, por si la decisión fue un error. */
export async function unbanUserAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  const user = await prisma.user.findUnique({ where: { id }, select: { emailVerifiedAt: true } });
  if (!user) return;
  await prisma.user.update({ where: { id }, data: { accountStatus: user.emailVerifiedAt ? "approved" : "email_pending" } });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function logoutAdminAction() {
  await destroyAdminSession();
  redirect("/admin/entrar");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string, fallback: number, min: number, max: number) {
  const parsed = parseFloat(String(formData.get(key) ?? ""));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function saveAdAction(formData: FormData) {
  await requireAdmin();
  const slot = text(formData, "slot");
  const title = text(formData, "title");
  if (!slot) return;

  const existing = await prisma.ad.findUnique({ where: { slot } });
  let imageUrl = existing?.imageUrl ?? null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, { imagesOnly: true });
    imageUrl = saved.url;
  }

  const imageScale = num(formData, "imageScale", 1, 0.2, 6);
  const imageX = num(formData, "imageX", 0, -3, 3);
  const imageY = num(formData, "imageY", 0, -3, 3);
  const imageStretchX = num(formData, "imageStretchX", 1, 0.2, 5);
  const imageStretchY = num(formData, "imageStretchY", 1, 0.2, 5);

  const areaCode = text(formData, "whatsappAreaCode").replace(/\D/g, "");
  const number = text(formData, "whatsappNumber").replace(/\D/g, "");
  const whatsappPhone = areaCode.length === 4 && number.length === 6 ? `${areaCode}${number}` : null;
  const whatsappMessage = text(formData, "whatsappMessage") || null;

  await prisma.ad.upsert({
    where: { slot },
    create: { slot, title, imageUrl, imageScale, imageX, imageY, imageStretchX, imageStretchY, whatsappPhone, whatsappMessage, enabled: formData.get("enabled") === "on" },
    update: { title, imageUrl, imageScale, imageX, imageY, imageStretchX, imageStretchY, whatsappPhone, whatsappMessage, enabled: formData.get("enabled") === "on" },
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

export type KycDecision = "approve" | "changes" | "reject";

export async function reviewKycAction(action: KycDecision, formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
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
    await notificar(tx, kyc.userId, {
      kind: "kyc",
      title: action === "approve" ? "Tu perfil quedó aprobado" : action === "changes" ? "Te pedimos cambios en la verificación" : "Rechazamos tu verificación",
      body: action === "approve" ? "Ya podés recibir trabajos en Ofrezco." : reason,
      url: "/pro",
      groupKey: `kyc:${kyc.id}`,
    });
  });
  revalidatePath("/admin");
  revalidatePath("/");
}
