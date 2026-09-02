import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { campoLeido, contarChatsConNoLeidos, contarNoLeidos, type Viewer } from "@/lib/mensajes";

/**
 * Quién es el que mira esta conversación.
 *
 * El rol sale de la sesión, nunca del body: si lo mandara el cliente, cualquiera
 * podría escribir haciéndose pasar por el profesional. Devuelve rol null si la
 * persona no es parte de la conversación.
 */
export async function participantIn(conversationId: string) {
  const user = await getSessionUser();
  if (!user) return { user: null, role: null, conversation: null } as const;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { professional: { select: { userId: true, profileStatus: true, user: { select: { accountStatus: true } } } } },
  });
  if (!conversation) return { user, role: null, conversation: null } as const;

  if (conversation.userId === user.id) {
    return { user, role: "cliente" as const, conversation };
  }
  if (conversation.professional.userId && conversation.professional.userId === user.id) {
    return { user, role: "profesional" as const, conversation };
  }
  return { user, role: null, conversation } as const;
}

export type ResumenNoLeidos = {
  /** Chats con algo sin leer: el número del globito. */
  total: number;
  porConversacion: Record<string, number>;
};

/** Lo sin leer de todos los hilos del que mira. */
export async function resumenNoLeidos(
  viewer: Viewer,
  { userId, professionalId }: { userId: string; professionalId?: string | null }
): Promise<ResumenNoLeidos> {
  const esPro = viewer === "profesional";
  if (esPro && !professionalId) return { total: 0, porConversacion: {} };

  const conversations = await prisma.conversation.findMany({
    where: esPro ? { professionalId: professionalId! } : { userId },
    select: {
      id: true,
      leidoCliente: true,
      leidoPro: true,
      // Solo lo que hace falta para contar: ni textos ni adjuntos, que esto se
      // consulta cada pocos segundos desde el globito.
      messages: { select: { sender: true, createdAt: true } },
    },
  });

  const porConversacion: Record<string, number> = {};
  for (const c of conversations) {
    porConversacion[c.id] = contarNoLeidos(
      c.messages,
      viewer,
      esPro ? c.leidoPro : c.leidoCliente
    );
  }

  return { total: contarChatsConNoLeidos(porConversacion), porConversacion };
}

/**
 * Marca el hilo como visto hasta ahora para el lado que lo abrió.
 *
 * Se le repite el `updatedAt` que ya tenía porque el campo es @updatedAt: sin
 * eso, abrir una conversación vieja la haría saltar al tope de la lista, que
 * está ordenada por actividad. Leer no es actividad.
 */
export async function marcarLeida(
  conversation: { id: string; updatedAt: Date },
  viewer: Viewer
) {
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { [campoLeido(viewer)]: new Date(), updatedAt: conversation.updatedAt },
  });
}
