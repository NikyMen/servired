import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Avisos de la campanita. Son una tabla y no una cuenta calculada porque
 * "tu solicitud vence mañana" o "resolvimos tu denuncia" pasan una sola vez:
 * hay que recordar si ya se vieron, no rearmarlos en cada consulta.
 */
export type AvisoKind =
  | "mensaje"
  | "propuesta"
  | "propuesta_resuelta"
  | "solicitud"
  | "solicitud_por_vencer"
  | "kyc"
  | "denuncia";

export type Aviso = {
  kind: AvisoKind;
  title: string;
  body?: string | null;
  url: string;
  /**
   * Junta lo repetido. Con `msg:<conversationId>`, veinte mensajes sin leer de
   * un mismo hilo son un solo renglón y no veinte.
   */
  groupKey?: string | null;
};

/** Prisma normal o el de una transacción: los avisos se emiten donde pasa el hecho. */
type Db = Prisma.TransactionClient | typeof prisma;

export async function notificar(db: Db, userId: string, aviso: Aviso) {
  const data = { userId, kind: aviso.kind, title: aviso.title, body: aviso.body ?? null, url: aviso.url, groupKey: aviso.groupKey ?? null };
  if (!data.groupKey) {
    await db.notification.create({ data });
    return;
  }
  // Al reagrupar vuelve a contar como sin leer y sube al tope de la lista.
  await db.notification.upsert({
    where: { userId_groupKey: { userId, groupKey: data.groupKey } },
    create: data,
    update: { ...data, readAt: null, createdAt: new Date() },
  });
}

/** Un mismo aviso para varias personas, en una sola escritura. */
export async function notificarA(db: Db, userIds: string[], aviso: Aviso) {
  if (!userIds.length) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, kind: aviso.kind, title: aviso.title, body: aviso.body ?? null, url: aviso.url, groupKey: aviso.groupKey ?? null })),
  });
}

/**
 * "Te escribieron", agrupado por hilo: veinte mensajes sin leer de la misma
 * conversación son un solo renglón en la campanita.
 */
export async function notificarMensaje(db: Db, opciones: { conversationId: string; paraUserId: string | null; paraRol: "cliente" | "profesional"; deNombre: string; texto: string }) {
  if (!opciones.paraUserId) return;
  await notificar(db, opciones.paraUserId, {
    kind: "mensaje",
    title: `Mensaje de ${opciones.deNombre}`,
    body: opciones.texto.trim().slice(0, 120) || "Te mandó un archivo",
    url: `${opciones.paraRol === "profesional" ? "/pro" : ""}/mensajes?conversacion=${opciones.conversationId}`,
    groupKey: `msg:${opciones.conversationId}`,
  });
}
