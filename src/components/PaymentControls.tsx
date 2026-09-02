"use client";

import { useCallback, useEffect, useState } from "react";
import { BookingActions } from "@/components/BookingActions";
import { BriefcaseIcon, XIcon } from "@/components/icons";
import { StatusPill } from "@/components/ui";

type Proposal = { id: string; amount: number; status: string; expiresAt: string; message?: string | null };
type Payment = { id: string; status: string };
type Booking = { id: string; note: string | null; status: string; finalPrice: number | null; workSummary: string | null; paymentAlias: string | null; paymentCvu: string | null; proposals: Proposal[]; payments: Payment[] };

export function PaymentControls({ conversationId, viewer }: { conversationId: string; viewer: "cliente" | "profesional" }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { const response = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { cache: "no-store" }); if (response.ok) setBooking((await response.json()).booking); }, [conversationId]);

  useEffect(() => { setOpen(false); void load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, [load]);

  async function requestWork() {
    setBusy(true); setError(null);
    const response = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", detail }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "No pudimos enviar la solicitud."); else { setDetail(""); await load(); }
    setBusy(false);
  }

  const activeProposal = booking?.proposals.find((proposal) => proposal.status === "pending") ?? null;
  const paidPaymentId = booking?.payments.find((payment) => payment.status === "pagado")?.id;
  return <>
    <button type="button" onClick={() => setOpen(true)} title="Trabajo y pago" aria-label="Trabajo y pago" className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/70"><BriefcaseIcon width={17} height={17} /><span className="hidden sm:inline">Trabajo</span></button>
    {open && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/30 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Trabajo, propuesta y pago" className="glass glass-solid animate-sheet-up w-full max-w-md rounded-3xl border-t-4 border-t-[var(--accent)] p-5 text-left shadow-2xl">
        <header className="mb-4 flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-slate-900">Trabajo, propuesta y pago</p><p className="text-xs text-slate-500">Todo el acuerdo queda asociado a este hilo.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button></header>
        {!booking && viewer === "cliente" && <div className="space-y-3"><textarea rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Describí el trabajo, medidas, materiales y fecha estimada" className="glass-field resize-none px-3 py-2.5 text-sm" /><button type="button" disabled={busy} onClick={requestWork} className="w-full rounded-xl bg-cliente px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Enviar solicitud de trabajo"}</button></div>}
        {!booking && viewer === "profesional" && <p className="rounded-2xl border border-dashed border-slate-200 bg-white/45 p-5 text-center text-sm text-slate-500">El cliente todavía no envió una solicitud.</p>}
        {booking && <div className="space-y-4"><div className="rounded-2xl bg-white/65 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solicitud</p><StatusPill status={booking.status} /></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{booking.note || "Servicio a convenir"}</p>{booking.workSummary && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{booking.workSummary}</p>}</div><BookingActions bookingId={booking.id} status={booking.status} viewer={viewer} proposal={activeProposal} finalPrice={booking.finalPrice} paymentAlias={booking.paymentAlias} paymentCvu={booking.paymentCvu} paidPaymentId={paidPaymentId} /></div>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </section>
    </div>}
  </>;
}
