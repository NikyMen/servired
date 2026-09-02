import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { Avatar, StatusPill } from "@/components/ui";
import { BookingActions } from "@/components/BookingActions";
import { InvitadoAviso } from "@/components/InvitadoAviso";
import { ChatIcon, CheckCircleIcon, ChevronLeftIcon } from "@/components/icons";
import { expirePendingProposals } from "@/lib/workflow";
import { canRevealPaymentDetails } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis propuestas" };

export default async function ContratacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { nueva } = await searchParams;
  // Sin sesión la página se ve igual, sólo que vacía: las propuestas son de
  // alguien, y un invitado todavía no es nadie.
  const user = await getSessionUser();
  await expirePendingProposals();

  const bookings = user
    ? await prisma.booking.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { professional: true, service: true, attachments: true, proposals: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } } },
      })
    : [];
  const conversations = user
    ? await prisma.conversation.findMany({ where: { userId: user.id }, select: { id: true, professionalId: true } })
    : [];
  const conversationByProfessional = new Map(conversations.map((conversation) => [conversation.professionalId, conversation.id]));

  return (
    <div className="space-y-6">
      {!user && <InvitadoAviso accion="contratar y seguir tus propuestas" next="/contrataciones" />}

      {nueva && (
        <div className="glass glass-thin flex items-center gap-3 rounded-2xl border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] p-4 text-cliente-dark">
          <CheckCircleIcon width={22} height={22} />
          <p className="text-sm font-medium">¡Listo! Enviamos tu solicitud de trabajo. El oferente puede responder con una propuesta.</p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mis propuestas</h1>
        <p className="mt-1 text-slate-500">Revisá los presupuestos y elegí cuáles aceptar.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="glass rounded-2xl border-dashed border-white/70 p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {user ? "Todavía no enviaste solicitudes" : "Acá van a estar tus solicitudes y propuestas"}
          </p>
          <p className="mt-1 text-slate-500">Buscá un profesional y contale qué necesitás desde su perfil.</p>
          <Link href="/" className="glass-btn mt-4 px-4 py-2.5 text-sm">
            Buscar profesionales
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const conversationId = conversationByProfessional.get(b.professionalId);
            return <li key={b.id}>
              <details className="glass glass-card group overflow-hidden rounded-2xl">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden">
                  <Avatar name={b.professional.name} color={b.professional.avatarColor} size={46} />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{b.service?.title ?? "Servicio a convenir"}</p><p className="truncate text-sm text-slate-500">{b.professional.name} · {b.professional.headline}</p></div>
                  {(b.finalPrice ?? b.quotedPrice) != null && <span className="hidden font-bold text-slate-800 sm:block">{formatARS(b.finalPrice ?? b.quotedPrice ?? 0)}</span>}
                  <StatusPill status={b.status} />
                  <ChevronLeftIcon width={18} height={18} className="rotate-[-90deg] text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-4 border-t border-white/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Creada por</p><div className="mt-2 flex items-center gap-2"><Avatar name={user?.name ?? b.clientName} color={user?.avatarColor ?? "#2563eb"} src={user?.avatarUrl} size={34} /><div><p className="text-sm font-semibold text-slate-800">{user?.name ?? b.clientName} (vos)</p><p className="text-xs text-slate-500">Cliente</p></div></div></div>
                    <div className="rounded-2xl bg-white/50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Profesional</p><p className="mt-2 text-sm font-semibold text-slate-800">{b.professional.name}</p><p className="text-xs text-slate-500">{b.professional.headline}</p></div>
                  </div>
                  <div><p className="text-xs font-semibold text-slate-500">Detalle del pedido</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{b.note || "Sin descripción adicional."}</p></div>
                  <p className="text-xs text-slate-400">Creada el {new Date(b.createdAt).toLocaleString("es-AR")}</p>
                  {b.workSummary && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-pro-dark">{b.workSummary}</p>}
                  {b.payments.map((payment) => <p key={payment.id} className={`rounded-xl px-3 py-2 text-xs font-semibold ${payment.status === "pagado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>Pago {payment.status}: {formatARS(payment.amount)}</p>)}
                  {b.attachments.length > 0 && <div className="flex flex-wrap gap-2">{b.attachments.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer"><img src={attachment.url} alt={attachment.name} className="size-20 rounded-xl object-cover ring-1 ring-slate-200" /></a>)}</div>}
                  <div className="flex flex-wrap items-center justify-between gap-3">{conversationId ? <Link href={`/mensajes?conversacion=${conversationId}`} className="inline-flex items-center gap-2 rounded-xl bg-cliente px-4 py-2 text-sm font-semibold text-white"><ChatIcon width={17} height={17} />Chatear</Link> : <span />}<BookingActions bookingId={b.id} status={b.status} viewer="cliente" proposal={b.proposals[0] ?? null} finalPrice={b.finalPrice} paymentAlias={canRevealPaymentDetails(b.status) ? b.professional.paymentAlias : null} paymentCvu={canRevealPaymentDetails(b.status) ? b.professional.paymentCvu : null} paidPaymentId={b.payments.find((payment) => payment.status === "pagado")?.id} /></div>
                </div>
              </details>
            </li>;
          })}
        </ul>
      )}
    </div>
  );
}
