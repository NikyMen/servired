import { prisma } from "@/lib/prisma";

export type PreinscriptionType = "cliente" | "profesional";
export type PreinscriptionInput = {
  name: string;
  email: string;
  phone: string;
  occupation: string | null;
  type: PreinscriptionType;
};

export function normalizePhone(raw: string) {
  const plus = raw.trim().startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

export function parsePreinscription(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
  const occupation = typeof body.occupation === "string" ? body.occupation.trim() || null : null;
  const type: PreinscriptionType = body.type === "profesional" ? "profesional" : "cliente";
  const errors: string[] = [];
  if (name.length < 2) errors.push("Ingresá tu nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push("Ingresá un correo válido.");
  if (phone.replace(/\D/g, "").length < 8) errors.push("Ingresá un teléfono válido (mínimo 8 dígitos).");
  return errors.length ? { error: errors.join(" ") } : { data: { name, email, phone, occupation, type } };
}

export function isDuplicatePreinscriptionError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function createPreinscription(data: PreinscriptionInput) {
  const created = await prisma.preregistration.create({ data });
  return { ...created, type: created.type as PreinscriptionType };
}
