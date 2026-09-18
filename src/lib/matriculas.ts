import { prisma } from "@/lib/prisma";
import { notificar } from "@/lib/notificaciones";
import { removeKycDocument, saveCredentialFile } from "@/lib/kyc";

/**
 * Matrículas y certificados. Son opcionales: subir uno no bloquea nada, y con
 * al menos uno aprobado el perfil muestra "Matriculado".
 */

export const TIPOS_CREDENCIAL = { matricula: "Matrícula", certificado: "Certificado" } as const;
export type TipoCredencial = keyof typeof TIPOS_CREDENCIAL;
export const MAX_CREDENCIALES = 10;

type Datos = { kind: string; categoryId?: string | null; number?: string | null; issuer?: string | null };

/** Datos de una credencial: tipo obligatorio; rubro, número y emisor opcionales. */
export function validarCredencial(datos: Datos, rubrosDelPro: string[]):
  | { error: string }
  | { data: { kind: TipoCredencial; categoryId: string | null; number: string | null; issuer: string | null } } {
  if (!(datos.kind in TIPOS_CREDENCIAL)) return { error: "Elegí si es una matrícula o un certificado." };
  const categoryId = datos.categoryId?.trim() || null;
  if (categoryId && !rubrosDelPro.includes(categoryId)) return { error: "Elegí uno de tus rubros." };
  const number = datos.number?.trim() || null;
  const issuer = datos.issuer?.trim() || null;
  if (number && number.length > 60) return { error: "El número puede tener hasta 60 caracteres." };
  if (issuer && issuer.length > 120) return { error: "Quién la emitió puede tener hasta 120 caracteres." };
  return { data: { kind: datos.kind as TipoCredencial, categoryId, number, issuer } };
}

export async function listarCredenciales(professionalId: string) {
  return prisma.credential.findMany({
    where: { professionalId },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, number: true, issuer: true, status: true, reviewReason: true, mimeType: true, createdAt: true, category: { select: { name: true } } },
  });
}

export async function crearCredencial(professionalId: string, datos: Datos, file: File | null): Promise<{ error: string } | { id: string }> {
  const [links, cantidad] = await Promise.all([
    prisma.professionalCategory.findMany({ where: { professionalId }, select: { categoryId: true } }),
    prisma.credential.count({ where: { professionalId } }),
  ]);
  const valid = validarCredencial(datos, links.map((l) => l.categoryId));
  if ("error" in valid) return valid;
  if (cantidad >= MAX_CREDENCIALES) return { error: `Podés tener hasta ${MAX_CREDENCIALES} documentos. Borrá alguno para subir otro.` };
  if (!file || !file.size) return { error: "Adjuntá la foto o el PDF." };
  let guardado: Awaited<ReturnType<typeof saveCredentialFile>>;
  try {
    guardado = await saveCredentialFile(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos guardar el archivo." };
  }
  try {
    const creada = await prisma.credential.create({ data: { professionalId, ...valid.data, ...guardado } });
    return { id: creada.id };
  } catch (error) {
    // Sin fila no tiene que quedar un archivo huérfano.
    await removeKycDocument(guardado.filename);
    throw error;
  }
}

/** La insignia depende de tener al menos una aprobada. */
export async function recalcularMatriculado(professionalId: string) {
  const aprobadas = await prisma.credential.count({ where: { professionalId, status: "approved" } });
  await prisma.professional.update({ where: { id: professionalId }, data: { matriculado: aprobadas > 0 } });
}

/** El profesional borra una pendiente o rechazada. Una aprobada solo la quita administración. */
export async function borrarCredencial(professionalId: string, id: string): Promise<{ error: string; status: number } | { ok: true }> {
  const credencial = await prisma.credential.findUnique({ where: { id } });
  if (!credencial || credencial.professionalId !== professionalId) return { error: "El documento no existe.", status: 404 };
  if (credencial.status === "approved") return { error: "Un documento aprobado lo quita administración. Escribinos si hace falta.", status: 409 };
  await prisma.credential.delete({ where: { id } });
  await removeKycDocument(credencial.filename);
  await recalcularMatriculado(professionalId);
  return { ok: true };
}

export type DecisionCredencial = "approve" | "reject";

/** Revisión de administración. Rechazar exige motivo, igual que el KYC. */
export async function revisarCredencial(id: string, decision: DecisionCredencial, motivo: string): Promise<{ error: string } | { ok: true }> {
  const reason = motivo.trim().slice(0, 1000);
  if (decision === "reject" && reason.length < 5) return { error: "Escribí el motivo del rechazo (al menos 5 caracteres)." };
  const credencial = await prisma.credential.findUnique({ where: { id }, include: { professional: { select: { id: true, userId: true } }, category: { select: { name: true } } } });
  if (!credencial) return { error: "El documento no existe." };
  await prisma.credential.update({
    where: { id },
    data: { status: decision === "approve" ? "approved" : "rejected", reviewReason: decision === "approve" ? null : reason, reviewedAt: new Date() },
  });
  await recalcularMatriculado(credencial.professional.id);
  if (credencial.professional.userId) {
    const tipo = TIPOS_CREDENCIAL[credencial.kind as TipoCredencial] ?? "Documento";
    await notificar(prisma, credencial.professional.userId, {
      kind: "matricula",
      title: decision === "approve" ? `${tipo} aprobada: tu perfil ya dice "Matriculado"` : `Rechazamos tu ${tipo.toLowerCase()}`,
      body: decision === "approve" ? (credencial.category ? `Rubro: ${credencial.category.name}` : null) : reason,
      url: "/pro/mi-perfil",
      groupKey: `credencial:${credencial.id}`,
    });
  }
  return { ok: true };
}
