import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { MapPinIcon, CheckCircleIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitudes abiertas" };

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Hace instantes";
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Hace 1 día" : `Hace ${d} días`;
}

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { nueva } = await searchParams;

  const requests = await prisma.serviceRequest.findMany({
    where: { status: "abierta" },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="space-y-6">
      {nueva && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-cliente-soft p-4 text-cliente-dark">
          <CheckCircleIcon width={22} height={22} />
          <p className="text-sm font-medium">
            ¡Tu solicitud fue publicada! Los profesionales te van a contactar por mensajes.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitudes abiertas</h1>
          <p className="mt-1 text-slate-500">
            {requests.length} personas buscando profesionales ahora mismo.
          </p>
        </div>
        <Link
          href="/publicar-solicitud"
          className="shrink-0 rounded-xl bg-cliente px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-cliente-dark"
        >
          Publicar solicitud
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {requests.map((r) => (
          <article key={r.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              {r.category ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cliente-soft px-2.5 py-1 text-xs font-medium text-cliente-dark">
                  <span>{r.category.icon}</span> {r.category.name}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Sin categoría</span>
              )}
              <StatusPill status={r.status} />
            </div>

            <h2 className="mt-3 font-semibold text-slate-900">{r.title}</h2>
            <p className="mt-1 line-clamp-3 text-sm text-slate-500">{r.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <MapPinIcon width={15} height={15} className="text-slate-400" />
                {r.zone}
              </span>
              {r.budget != null && (
                <span>
                  Presupuesto: <span className="font-medium text-slate-900">{formatARS(r.budget)}</span>
                </span>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {r.contactName} · {timeAgo(new Date(r.createdAt))}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
