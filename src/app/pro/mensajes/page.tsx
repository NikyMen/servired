import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Chat } from "@/components/Chat";
import { requirePro } from "@/lib/auth";
import { CLIENT_BLUE } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

export default async function ProMensajesPage() {
  const user = await requirePro("/pro/mensajes");

  const conversations = await prisma.conversation.findMany({
    where: { professionalId: user.professionalId },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { avatarColor: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="space-y-4">
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
