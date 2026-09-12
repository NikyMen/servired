import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SolicitudCard } from "@/components/pro/SolicitudCard";
import { expireServiceRequests, openRequestsWhere } from "@/lib/workflow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitudes de clientes" };

/**
 * Las solicitudes abiertas de los rubros del perfil, en su propia página.
 *
 * En el panel siguen apareciendo, pero mezcladas con los trabajos y los
 * servicios: acá se entra a buscar trabajo y nada más.
 */
export default async function ProSolicitudesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/pro/solicitudes");
  if (!user.canInteract) redirect("/onboarding");
  if (!user.professionalId || user.professionalStatus !== "approved") redirect("/pro");

  await expireServiceRequests();
  const pro = await prisma.professional.findUniqueOrThrow({
    where: { id: user.professionalId },
    select: { id: true, categoryLinks: { where: { category: { approvalStatus: "approved" } }, select: { categoryId: true } } },
  });
  const [requests, conversations] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { ...openRequestsWhere(pro.id), NOT: { userId: user.id }, categoryId: { in: pro.categoryLinks.map((link) => link.categoryId) } },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    prisma.conversation.findMany({ where: { professionalId: pro.id }, select: { userId: true } }),
  ]);
  const contactedUserIds = new Set(conversations.map((conversation) => conversation.userId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitudes de clientes</h1>
          <p className="mt-1 text-slate-500">Abiertas, de tus rubros y sin las que descartaste.</p>
        </div>
        <Link href="/pro" className="glass-btn glass-btn-ghost shrink-0 px-4 py-2.5 text-sm">Volver al panel</Link>
      </div>

      {requests.length === 0 ? (
        <p className="glass glass-solid rounded-2xl p-6 text-center text-sm text-slate-500">
          No hay solicitudes abiertas en tus rubros. Cuando alguien publique una, te avisamos.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <SolicitudCard
              key={request.id}
              request={{
                id: request.id,
                title: request.title,
                description: request.description,
                zone: request.zone,
                contactName: request.contactName,
                latitude: request.latitude,
                longitude: request.longitude,
                createdAt: request.createdAt.toISOString(),
                category: request.category ? { name: request.category.name, icon: request.category.icon } : null,
              }}
              alreadyContacted={contactedUserIds.has(request.userId)}
              puedeDescartar
            />
          ))}
        </div>
      )}
    </div>
  );
}
