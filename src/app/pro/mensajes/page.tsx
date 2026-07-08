import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDemoPro, CLIENT_BLUE } from "@/lib/demo";
import { Chat } from "@/components/Chat";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mensajes" };

export default async function ProMensajesPage() {
  const pro = await getDemoPro();
  if (!pro) notFound();

  const conversations = await prisma.conversation.findMany({
    where: { professionalId: pro.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
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
          withColor: CLIENT_BLUE,
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
