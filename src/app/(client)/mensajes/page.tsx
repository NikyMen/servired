import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Chat } from "@/components/Chat";
import { getSessionUser } from "@/lib/auth";
import { InvitadoAviso } from "@/components/InvitadoAviso";
import { PRO_GREEN } from "@/lib/brand";
import { contarNoLeidos } from "@/lib/mensajes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

export default async function MensajesPage({ searchParams }: { searchParams: Promise<{ conversacion?: string }> }) {
  const { conversacion } = await searchParams;
  const user = await getSessionUser();

  // Solo los hilos propios: antes se listaban los de todo el mundo. Un
  // invitado no tiene ninguno, y ver la bandeja de otro sería una fuga.
  const conversations = user
    ? await prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          professional: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      })
    : [];

  return (
    <div className="space-y-4">
      {!user && <InvitadoAviso accion="escribirle a un profesional" next="/mensajes" />}

      <div>
        <h1 className="text-2xl font-bold text-cliente-dark">Mensajes · Busco</h1>
        <p className="mt-1 text-slate-500">Coordiná los detalles con los profesionales.</p>
      </div>

      <Chat
        viewer="cliente"
        initialConversationId={conversacion}
        conversations={conversations.map((c) => ({
          id: c.id,
          withName: c.professional.name,
          withColor: c.professional.avatarColor || PRO_GREEN,
          noLeidos: contarNoLeidos(c.messages, "cliente", c.leidoCliente),
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
