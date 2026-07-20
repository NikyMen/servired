import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePro } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { Avatar, StatusPill } from "@/components/ui";
import { BookingActions } from "@/components/BookingActions";
import { ResponderSolicitud } from "@/components/ResponderSolicitud";
import { MapPinIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel del profesional" };

export default async function ProPanelPage() {
  // El panel es el del profesional logueado, no uno fijo del seed.
  const user = await requirePro("/pro");
  const pro = await prisma.professional.findUnique({ where: { id: user.professionalId } });
  if (!pro) notFound();

  const [bookings, requests, services] = await Promise.all([
    prisma.booking.findMany({
      where: { professionalId: pro.id },
      orderBy: { createdAt: "desc" },
      include: { service: true },
    }),
    prisma.serviceRequest.findMany({
      // Las propias no: no tiene sentido ofrecerse a responderse a uno mismo.
      where: { status: "abierta", NOT: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    prisma.service.findMany({
      where: { professionalId: pro.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const pendientes = bookings.filter((b) => b.status === "solicitada").length;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <section className="flex items-center gap-4 rounded-2xl bg-pro p-6 text-white">
        <Avatar name={pro.name} color="#047857" size={56} ring />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{pro.name}</h1>
          <p className="text-emerald-100">
            {pro.headline} · {pro.zone}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold">{pendientes}</p>
          <p className="text-sm text-emerald-100">
            {pendientes === 1 ? "pedido nuevo" : "pedidos nuevos"}
          </p>
        </div>
      </section>

      {/* Contrataciones recibidas */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Contrataciones</h2>
        {bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Cuando un cliente te contrate, el pedido aparece acá.
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {b.service?.title ?? "Servicio a convenir"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {b.clientName}
                    {b.note && <> · “{b.note}”</>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={b.status} />
                  <BookingActions bookingId={b.id} status={b.status} viewer="profesional" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Solicitudes abiertas de clientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Solicitudes de clientes</h2>
          <span className="text-sm text-slate-500">{requests.length} abiertas</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {requests.map((r) => (
            <article key={r.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                {r.category ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pro-soft px-2.5 py-1 text-xs font-medium text-pro-dark">
                    {r.category.icon} {r.category.name}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Sin categoría</span>
                )}
                {r.budget != null && (
                  <span className="text-sm font-medium text-slate-700">{formatARS(r.budget)}</span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-slate-900">{r.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.description}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPinIcon width={14} height={14} />
                  {r.zone} · {r.contactName}
                </span>
                <ResponderSolicitud
                  requestId={r.id}
                  clientName={r.contactName}
                  requestTitle={r.title}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Mis servicios */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Mis servicios</h2>
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {services.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{s.title}</p>
                <p className="truncate text-sm text-slate-500">{s.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold text-slate-900">{formatARS(s.priceFrom)}</span>
                <StatusPill status={s.status} />
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">
          Tu perfil público:{" "}
          <Link href={`/profesionales/${pro.id}`} className="font-medium text-pro hover:underline">
            ver cómo te ven los clientes
          </Link>
        </p>
      </section>
    </div>
  );
}
