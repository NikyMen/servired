import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CheckCircleIcon } from "@/components/icons";
import { SolicitudCard } from "@/components/pro/SolicitudCard";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitudes abiertas" };

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { nueva } = await searchParams;
  const [requests, user] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { status: "abierta" },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    getSessionUser(),
  ]);
  const contactedUserIds = user?.professionalId
    ? new Set((await prisma.conversation.findMany({ where: { professionalId: user.professionalId }, select: { userId: true } })).map((conversation) => conversation.userId))
    : new Set<string>();

  return (
    <div className="space-y-6">
      {nueva && (
        <div className="glass glass-thin flex items-center gap-3 rounded-2xl border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] p-4 text-cliente-dark">
          <CheckCircleIcon width={22} height={22} />
          <p className="text-sm font-medium">¡Tu solicitud fue publicada! Los profesionales te van a contactar por mensajes.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitudes abiertas</h1>
          <p className="mt-1 text-slate-500">{requests.length} personas buscando profesionales ahora mismo.</p>
        </div>
        <Link href="/publicar-solicitud" className="shrink-0 rounded-xl bg-cliente px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-cliente-dark">
          Publicar solicitud
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {requests.map((r) => (
          <SolicitudCard
            key={r.id}
            request={{
              id: r.id,
              title: r.title,
              description: r.description,
              zone: r.zone,
              contactName: r.contactName,
              latitude: r.latitude,
              longitude: r.longitude,
              createdAt: r.createdAt.toISOString(),
              category: r.category ? { name: r.category.name, icon: r.category.icon } : null,
            }}
            alreadyContacted={contactedUserIds.has(r.userId)}
          />
        ))}
      </div>
    </div>
  );
}
