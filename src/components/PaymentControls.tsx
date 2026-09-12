"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookingActions } from "@/components/BookingActions";
import { BriefcaseIcon, XIcon } from "@/components/icons";
import { StatusPill } from "@/components/ui";
import { jobProgress } from "@/lib/trabajo";

type Proposal = { id: string; amount: number; status: string; expiresAt: string; message?: string | null; estimatedDays?: number | null };
type Payment = { id: string; status: string };
type Booking = { id: string; note: string | null; status: string; finalPrice: number | null; workSummary: string | null; startedAt: string | null; dueAt: string | null; paymentHandle: string | null; paymentHandleKind: string | null; proposals: Proposal[]; payments: Payment[] };

export function PaymentControls({ conversationId, viewer }: { conversationId: string; viewer: "cliente" | "profesional" }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { const response = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { cache: "no-store" }); if (response.ok) setBooking((await response.json()).booking); }, [conversationId]);

  useEffect(() => { setOpen(false); void load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, [load]);

  async function sendProposal() {
    setBusy(true); setError(null);
    const response = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "propose", amount: Number(amount), detail, estimatedDays: Number(days) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "No pudimos enviar la propuesta."); else { setDetail(""); setAmount(""); setDays(""); await load(); }
    setBusy(false);
  }

  const activeProposal = booking?.proposals.find((proposal) => proposal.status === "pending") ?? null;
  const paidPaymentId = booking?.payments.find((payment) => payment.status === "pagado")?.id;
  const buttonLabel = viewer === "profesional" ? "Enviar propuesta" : "Propuesta";
  return <>
    <button type="button" onClick={() => setOpen(true)} title={buttonLabel} aria-label={buttonLabel} className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/70"><BriefcaseIcon width={17} height={17} /><span className="hidden sm:inline">{buttonLabel}</span></button>
    {open && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/30 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Trabajo, propuesta y pago" className="glass glass-solid animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border-t-4 border-t-[var(--accent)] p-5 text-left shadow-2xl">
        <header className="mb-4 flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-slate-900">Trabajo, propuesta y pago</p><p className="text-xs text-slate-500">Todo el acuerdo queda asociado a este hilo.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button></header>
        {!booking && viewer === "profesional" && <div className="space-y-3"><input type="number" min="100" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Monto de la propuesta en ARS" className="glass-field px-3 py-2.5 text-sm" /><input type="number" min="1" max="365" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} placeholder="¿En cuántos días lo terminás?" className="glass-field px-3 py-2.5 text-sm" /><textarea rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Detalle del trabajo (opcional)" className="glass-field resize-none px-3 py-2.5 text-sm" /><button type="button" disabled={busy || Number(amount) < 100 || Number(days) < 1} onClick={sendProposal} className="w-full rounded-xl bg-pro px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Enviar propuesta"}</button><p className="text-center text-[11px] text-slate-400">Solo podés tener una propuesta activa. El cliente debe rechazarla antes de que puedas enviar otra. Vence en 3 días. Los días arrancan a contar cuando la acepta.</p></div>}
        {!booking && viewer === "cliente" && <p className="rounded-2xl border border-dashed border-slate-200 bg-white/45 p-5 text-center text-sm text-slate-500">El oferente todavía no te envió una propuesta.</p>}
        {booking && <div className="space-y-4"><div className="rounded-2xl bg-white/65 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Propuesta</p><StatusPill status={booking.status} /></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{booking.note || "Servicio a convenir"}</p>{booking.workSummary && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{booking.workSummary}</p>}{booking.status === "in_progress" && booking.startedAt && booking.dueAt && <BarraDePlazo startedAt={booking.startedAt} dueAt={booking.dueAt} />}</div><BookingActions bookingId={booking.id} status={booking.status} viewer={viewer} proposal={activeProposal} finalPrice={booking.finalPrice} paymentHandle={booking.paymentHandle} paymentHandleKind={booking.paymentHandleKind} paidPaymentId={paidPaymentId} /></div>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </section>
    </div>, document.body)}
  </>;
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
