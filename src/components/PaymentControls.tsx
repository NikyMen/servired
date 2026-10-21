"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookingActions } from "@/components/BookingActions";
import { XIcon } from "@/components/icons";
import { StatusPill } from "@/components/ui";
import { jobProgress } from "@/lib/trabajo";
import { type PropuestaVista, estadoAcuerdo } from "@/lib/presupuesto";

export { estadoAcuerdo } from "@/lib/presupuesto";

type Proposal = { id: string; amount: number; status: string; expiresAt: string; message?: string | null; estimatedDays?: number | null };
type Payment = { id: string; status: string };
export type Booking = { id: string; note: string | null; status: string; finalPrice: number | null; workSummary: string | null; startedAt: string | null; dueAt: string | null; mercadoPagoAvailable: boolean; proposals: Proposal[]; payments: Payment[] };
type Viewer = "cliente" | "profesional";

/**
 * Acuerdo del hilo, pedido cada 5 s. Un solo poll para el encabezado, la
 * franja, las tarjetas y el panel. `propuestas` son todas las de la pareja
 * (también las de acuerdos ya cerrados): cada tarjeta 💰 busca ahí la suya.
 */
export function useAcuerdo(conversationId: string | null) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaVista[]>([]);
  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setBooking(data.booking);
      setPropuestas(data.propuestas ?? []);
    } catch {
      // Se cortó la red: el próximo tick reintenta.
    }
  }, [conversationId]);

  useEffect(() => {
    setBooking(null);
    setPropuestas([]);
    void load();
    // En segundo plano no se pregunta; al volver a la pestaña, en el acto.
    const tick = () => document.visibilityState === "visible" && void load();
    const timer = window.setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  return { booking, propuestas, reload: load };
}

/**
 * El detalle del acuerdo, con todas sus acciones. Ya no tiene botón propio en
 * la barra de escribir: lo abren el estado del encabezado y la franja.
 */
export function PanelAcuerdo({ open, onClose, viewer, booking, onDone, inicial = null }: { open: boolean; onClose: () => void; viewer: Viewer; booking: Booking | null; onDone: () => Promise<void>; inicial?: "finish" | "review" | null }) {
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const activeProposal = booking?.proposals.find((proposal) => proposal.status === "pending") ?? null;
  const paidPaymentId = booking?.payments.find((payment) => payment.status === "pagado")?.id;
  const estado = estadoAcuerdo(booking, viewer);
  return createPortal(<div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/30 sm:items-center sm:p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Trabajo, presupuesto y pago" className="glass glass-solid animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left shadow-2xl sm:rounded-3xl">
      <header className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-lg font-bold text-slate-900">{booking ? estado.label : "Trabajo, presupuesto y pago"}</p><p className="text-xs text-slate-500">Todo el acuerdo queda asociado a este hilo.</p></div><button type="button" autoFocus onClick={onClose} aria-label="Cerrar" className="grid size-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button></header>
      {!booking && <p className="rounded-2xl border border-dashed border-slate-200 bg-white/45 p-5 text-center text-sm text-slate-500">{viewer === "cliente" ? "El oferente todavía no te envió un presupuesto." : "Todavía no mandaste un presupuesto."}</p>}
      {booking && <div className="space-y-4"><div className="rounded-2xl bg-white/65 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trabajo</p><StatusPill status={booking.status} /></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{booking.note || "Servicio a convenir"}</p>{booking.workSummary && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{booking.workSummary}</p>}{booking.status === "in_progress" && booking.startedAt && booking.dueAt && <BarraDePlazo startedAt={booking.startedAt} dueAt={booking.dueAt} />}</div><BookingActions key={`${booking.id}:${booking.status}:${inicial ?? ""}`} bookingId={booking.id} status={booking.status} viewer={viewer} proposal={activeProposal} finalPrice={booking.finalPrice} paidPaymentId={paidPaymentId} mercadoPagoAvailable={booking.mercadoPagoAvailable} onDone={onDone} inicial={inicial} /></div>}
    </section>
  </div>, document.body);
}

/** El plazo prometido, en curso. Se dibuja sola: el panel ya se refresca cada 5 s. */
function BarraDePlazo({ startedAt, dueAt }: { startedAt: string; dueAt: string }) {
  const plazo = jobProgress(startedAt, dueAt);
  const color = plazo.overdue ? "bg-red-500" : plazo.remainingDays <= 1 ? "bg-amber-500" : "bg-pro";
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-slate-600">Día {plazo.elapsedDays} de {plazo.totalDays}</span>
        <span className={plazo.overdue ? "font-semibold text-red-600" : "text-slate-500"}>
          {plazo.overdue ? "Pasó el plazo" : plazo.remainingDays === 0 ? "Vence hoy" : `Faltan ${plazo.remainingDays} ${plazo.remainingDays === 1 ? "día" : "días"}`}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={plazo.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del plazo">
        <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${plazo.percent}%` }} />
      </div>
    </div>
  );
}
