import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Chat } from "@/components/Chat";
import { PRO_GREEN } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

export default async function MensajesPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      professional: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mensajes</h1>
        <p className="mt-1 text-slate-500">Coordiná los detalles con los profesionales.</p>
      </div>

      <Chat
        viewer="cliente"
        conversations={conversations.map((c) => ({
          id: c.id,
          withName: c.professional.name,
          withColor: c.professional.avatarColor || PRO_GREEN,
          messages: c.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            createdAt: m.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
