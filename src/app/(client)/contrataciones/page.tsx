import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { Avatar, StatusPill } from "@/components/ui";
import { BookingActions } from "@/components/BookingActions";
import { CheckCircleIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis propuestas" };

export default async function ContratacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { nueva } = await searchParams;
  const user = await requireUser("/contrataciones");

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { professional: true, service: true, attachments: true },
  });

  return (
    <div className="space-y-6">
      {nueva && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-cliente-soft p-4 text-cliente-dark">
          <CheckCircleIcon width={22} height={22} />
          <p className="text-sm font-medium">¡Listo! Enviamos tu propuesta al profesional. Te va a responder con un presupuesto.</p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis propuestas</h1>
        <p className="mt-1 text-slate-500">Revisá los presupuestos y elegí cuáles aceptar.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">Todavía no enviaste propuestas</p>
          <p className="mt-1 text-slate-500">Buscá un profesional y contale qué necesitás desde su perfil.</p>
          <Link href="/" className="mt-4 inline-block rounded-xl bg-cliente px-4 py-2.5 text-sm font-medium text-white hover:bg-cliente-dark">
            Buscar profesionales
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
              <Avatar name={b.professional.name} color={b.professional.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{b.service?.title ?? "Servicio a convenir"}</p>
                <p className="text-sm text-slate-500">
                  {b.professional.name} · {b.professional.headline}
                  {(b.finalPrice ?? b.quotedPrice) != null && <> · <span className="font-medium text-slate-700">{formatARS(b.finalPrice ?? b.quotedPrice ?? 0)}</span></>}
                </p>
                <p className="text-xs text-slate-400">Pedido el {new Date(b.createdAt).toLocaleDateString("es-AR")}</p>
                {b.note && <p className="mt-1 text-sm text-slate-600">{b.note}</p>}
                {b.status === "completada" && b.workSummary && <p className="mt-1 text-xs text-pro-dark">{b.workSummary}</p>}
                {b.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer">
                        <img src={attachment.url} alt={attachment.name} className="size-16 rounded-xl object-cover ring-1 ring-slate-200" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusPill status={b.status} />
                <BookingActions bookingId={b.id} status={b.status} viewer="cliente" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
