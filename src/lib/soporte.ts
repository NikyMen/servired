import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { AYUDA_DEFAULT, validSupportPhone, waLink } from "@/lib/whatsapp";

/**
 * El WhatsApp de soporte vive en la tabla de placas con una clave reservada:
 * ya tiene número, mensaje y "activa", que es justo lo que hace falta, y así no
 * hay que tocar el esquema. No aparece entre las placas porque esas son una
 * lista fija de slots.
 */
export const SOPORTE_SLOT = "ayuda";

/** Para el botón flotante: null si no hay número cargado o está apagado. */
export const getSoporte = cache(async () => {
  const row = await prisma.ad.findUnique({ where: { slot: SOPORTE_SLOT }, select: { whatsappPhone: true, whatsappMessage: true, enabled: true } });
  if (!row?.enabled || !row.whatsappPhone) return null;
  return { href: waLink(row.whatsappPhone, row.whatsappMessage || AYUDA_DEFAULT) };
});

/** Lo que muestra el formulario de administración. */
export async function getSoporteConfig() {
  const row = await prisma.ad.findUnique({ where: { slot: SOPORTE_SLOT }, select: { whatsappPhone: true, whatsappMessage: true, enabled: true } });
  return { phone: row?.whatsappPhone ?? "", message: row?.whatsappMessage ?? "", enabled: row?.enabled ?? true };
}

/** Valida y guarda. Un número inválido no se guarda: se devuelve el motivo. */
export async function guardarSoporte(input: { phone: string; message: string; enabled: boolean }) {
  const phone = validSupportPhone(input.phone);
  if (!phone) return { error: "El número tiene que tener 10 dígitos: característica sin 0 y número sin 15 (ej. 3794123456)." };
  const whatsappMessage = input.message.trim().slice(0, 500) || null;
  const data = { whatsappPhone: phone, whatsappMessage, enabled: input.enabled };
  await prisma.ad.upsert({ where: { slot: SOPORTE_SLOT }, create: { slot: SOPORTE_SLOT, ...data }, update: data });
  return { ok: true as const };
}
