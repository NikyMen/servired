import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Chat } from "@/components/Chat";
import { getSessionUser } from "@/lib/auth";
import { InvitadoAviso } from "@/components/InvitadoAviso";
import { CLIENT_BLUE } from "@/lib/brand";
import { contarNoLeidos } from "@/lib/mensajes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

export default async function ProMensajesPage() {
  const user = await getSessionUser();
  const professionalId = user?.professionalId ?? null;

  // Sin perfil profesional propio no hay bandeja: la de otro no se muestra.
  const conversations = professionalId
    ? await prisma.conversation.findMany({
        where: { professionalId },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { avatarColor: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      })
    : [];

  return (
    <div className="space-y-4">
      {!professionalId && (
        <InvitadoAviso accion="responderles a los clientes" next="/pro/mensajes" />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mensajes</h1>
        <p className="mt-1 text-slate-500">Respondé rápido: es la clave para conseguir clientes.</p>
      </div>

      <Chat
        viewer="profesional"
        conversations={conversations.map((c) => ({
          id: c.id,
          withName: c.clientName,
          withColor: c.user.avatarColor || CLIENT_BLUE,
          noLeidos: contarNoLeidos(c.messages, "profesional", c.leidoPro),
          messages: c.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            createdAt: m.createdAt.toISOString(),
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            attachmentType: m.attachmentType,
            attachmentSize: m.attachmentSize,
          })),
        }))}
      />
    </div>
  );
}
