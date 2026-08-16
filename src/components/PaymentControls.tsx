"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatARS } from "@/lib/format";
import { BriefcaseIcon, XIcon } from "@/components/icons";

type Payment = { id: string; amount: number; commission: number; netAmount: number; status: string; checkoutToken: string; review: { id: string } | null };
type Booking = { id: string; note: string | null; status: string; quotedPrice: number | null; finalPrice: number | null; service: { title: string } | null; payments: Payment[] };
type Agreement = { booking: Booking | null; novelty: { proposal: boolean; payment: boolean } };

export function PaymentControls({ conversationId, viewer }: { conversationId: string; viewer: "cliente" | "profesional" }) {
  const [agreement, setAgreement] = useState<Agreement>({ booking: null, novelty: { proposal: false, payment: false } });
  const [panel, setPanel] = useState<"proposal" | "payment" | null>(null);
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const reviewImage = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { cache: "no-store" });
    if (res.ok) setAgreement(await res.json());
  }, [conversationId]);

  useEffect(() => {
    setPanel(null);
    setError(null);
    void load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function markSeen(kind: "proposal" | "payment") {
    setAgreement((current) => ({ ...current, novelty: { ...current.novelty, [kind]: false } }));
    await fetch(`/api/conversaciones/${conversationId}/acuerdo`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seen", kind }),
    });
  }

  function openPanel(kind: "proposal" | "payment") {
    setPanel(kind);
    setError(null);
    void markSeen(kind);
  }

  async function agreementAction(action: "request" | "quote") {
    setBusy(true); setError(null);
    const body = action === "request"
      ? { action, detail }
      : { action, bookingId: agreement.booking?.id, amount };
    const res = await fetch(`/api/conversaciones/${conversationId}/acuerdo`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "No pudimos actualizar la propuesta.");
    else { setDetail(""); setAmount(""); await load(); }
    setBusy(false);
  }

  async function createPayment() {
    setBusy(true); setError(null);
    const res = await fetch(`/api/conversaciones/${conversationId}/pagos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "No pudimos iniciar el pago."); else await load();
    setBusy(false);
  }

  async function review(paymentId: string) {
    setBusy(true); setError(null);
    let imageUrl: string | null = null;
    const file = reviewImage.current?.files?.[0];
    if (file) {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await up.json().catch(() => ({}));
      if (!up.ok) { setError(data.error ?? "No pudimos subir la imagen."); setBusy(false); return; }
      imageUrl = data.url;
    }
    const res = await fetch(`/api/pagos/${paymentId}/resena`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment, imageUrl }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "No pudimos guardar la reseña."); else { setReviewFor(null); setComment(""); await load(); }
    setBusy(false);
  }

  const booking = agreement.booking;
  const pendingPayment = booking?.payments.find((payment) => payment.status === "pendiente");
  const paidPayment = booking?.payments.find((payment) => payment.status === "pagado");
  const canPay = viewer === "cliente" && !!booking?.quotedPrice && ["presupuestada", "aceptada"].includes(booking.status);

  return <>
    <ActionButton label="Propuesta" active={panel === "proposal"} novelty={agreement.novelty.proposal} onClick={() => openPanel("proposal")}>
      <BriefcaseIcon width={17} height={17} />
    </ActionButton>
    <ActionButton label="Mercado Pago" active={panel === "payment"} novelty={agreement.novelty.payment} disabled={viewer === "cliente" && !canPay && !paidPayment} onClick={() => openPanel("payment")} mercadoPago>
      <img src="/mercado-pago.svg" alt="" width="32" height="24" className="h-6 w-8 object-contain" />
    </ActionButton>

    {panel && <div data-modo={viewer === "profesional" ? "pro" : "cliente"} className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/30 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
      <section role="dialog" aria-modal="true" aria-label={panel === "proposal" ? "Propuesta" : "Mercado Pago"} className="glass glass-solid animate-sheet-up w-full max-w-md rounded-3xl border-t-4 border-t-[var(--accent)] p-5 text-left shadow-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">{panel === "proposal" ? "Propuesta y presupuesto" : "Mercado Pago"}</p>
            <p className="text-xs text-slate-500">{panel === "proposal" ? "Este intercambio queda separado de los mensajes." : "El monto lo define el presupuesto del profesional."}</p>
          </div>
          <button type="button" onClick={() => setPanel(null)} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button>
        </header>

        {panel === "proposal" && <ProposalPanel viewer={viewer} booking={booking} detail={detail} amount={amount} busy={busy} setDetail={setDetail} setAmount={setAmount} onRequest={() => agreementAction("request")} onQuote={() => agreementAction("quote")} />}
        {panel === "payment" && <PaymentPanel viewer={viewer} booking={booking} pendingPayment={pendingPayment} paidPayment={paidPayment} busy={busy} reviewFor={reviewFor} rating={rating} comment={comment} reviewImage={reviewImage} setReviewFor={setReviewFor} setRating={setRating} setComment={setComment} createPayment={createPayment} review={review} />}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </section>
    </div>}
  </>;
}

function ActionButton({ label, active, novelty, disabled, mercadoPago, onClick, children }: { label: string; active: boolean; novelty: boolean; disabled?: boolean; mercadoPago?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} title={label} aria-label={label} className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${mercadoPago ? "text-[#087eb5] hover:bg-[#e8f7fd]" : "text-slate-500 hover:bg-white/70"} ${active ? "bg-white/80" : ""}`}>
    {children}<span className={mercadoPago ? "sr-only" : ""}>{label}</span>
    {novelty && <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-label="Hay una novedad" />}
  </button>;
}

function ProposalPanel({ viewer, booking, detail, amount, busy, setDetail, setAmount, onRequest, onQuote }: { viewer: "cliente" | "profesional"; booking: Booking | null; detail: string; amount: string; busy: boolean; setDetail: (value: string) => void; setAmount: (value: string) => void; onRequest: () => void; onQuote: () => void }) {
  if (!booking) return viewer === "cliente" ? <div className="space-y-3"><label className="block text-sm font-semibold text-slate-700">¿Qué trabajo necesitás?<textarea rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Describí el trabajo, medidas, materiales y fecha estimada" className="glass-field mt-2 resize-none px-3 py-2.5 text-sm" /></label><button type="button" disabled={busy} onClick={onRequest} className="w-full rounded-xl bg-cliente px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Pedir presupuesto"}</button></div> : <EmptyState text="El cliente todavía no pidió un presupuesto." />;

  return <div className="space-y-3">
    <div className="rounded-2xl bg-white/65 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pedido del cliente</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{booking.note || booking.service?.title || "Servicio a convenir"}</p></div>
    {booking.status === "solicitada" && (viewer === "profesional" ? <div className="space-y-2"><label className="block text-sm font-semibold text-slate-700">Tu presupuesto estimado<input type="number" min="100" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Monto en ARS" className="glass-field mt-2 px-3 py-2.5 text-sm" /></label><button type="button" disabled={busy} onClick={onQuote} className="w-full rounded-xl bg-pro px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Enviar presupuesto"}</button></div> : <EmptyState text="Solicitud enviada. Te avisamos cuando el profesional la presupueste." />)}
    {booking.quotedPrice != null && <div className={`rounded-2xl border p-4 ${viewer === "cliente" ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50"}`}><p className={`text-xs font-semibold ${viewer === "cliente" ? "text-blue-700" : "text-emerald-700"}`}>Presupuesto del profesional</p><p className="mt-1 text-2xl font-bold text-slate-900">{formatARS(booking.quotedPrice)}</p><p className="text-xs text-slate-500">Monto estimado para el trabajo detallado.</p></div>}
  </div>;
}

function PaymentPanel({ viewer, booking, pendingPayment, paidPayment, busy, reviewFor, rating, comment, reviewImage, setReviewFor, setRating, setComment, createPayment, review }: { viewer: "cliente" | "profesional"; booking: Booking | null; pendingPayment?: Payment; paidPayment?: Payment; busy: boolean; reviewFor: string | null; rating: number; comment: string; reviewImage: React.RefObject<HTMLInputElement | null>; setReviewFor: (id: string | null) => void; setRating: (n: number) => void; setComment: (text: string) => void; createPayment: () => void; review: (id: string) => void }) {
  if (!booking?.quotedPrice) return <EmptyState text={viewer === "cliente" ? "El pago se habilita cuando el profesional envía su presupuesto." : "Primero tenés que enviarle un presupuesto al cliente."} />;
  return <div className="space-y-3">
    <div className="rounded-2xl bg-[#e8f7fd] p-4"><p className="text-xs font-semibold text-[#087eb5]">Presupuesto acordado</p><p className="mt-1 text-2xl font-bold text-slate-900">{formatARS(booking.quotedPrice)}</p>{viewer === "profesional" && <p className="text-xs text-slate-500">Al acreditarse recibís {formatARS(Math.round(booking.quotedPrice * 0.9))}.</p>}</div>
    {paidPayment ? <p className="rounded-xl bg-emerald-100 px-3 py-2.5 text-center text-sm font-semibold text-emerald-700">Pago acreditado · {formatARS(paidPayment.amount)}</p> : pendingPayment ? (viewer === "cliente" ? <a href={`/pago-demo/${pendingPayment.checkoutToken}`} className="block rounded-xl bg-[#009ee3] px-4 py-3 text-center text-sm font-semibold text-white">Continuar pago en Mercado Pago</a> : <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm font-semibold text-amber-700">Esperando el pago del cliente</p>) : (viewer === "cliente" ? <button type="button" disabled={busy} onClick={createPayment} className="w-full rounded-xl bg-[#009ee3] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Preparando…" : `Pagar ${formatARS(booking.quotedPrice)}`}</button> : <p className="text-center text-sm text-slate-500">El cliente ya puede pagar este presupuesto.</p>)}
    {viewer === "cliente" && paidPayment && !paidPayment.review && (reviewFor === paidPayment.id ? <div className="space-y-2 rounded-xl bg-white/70 p-3"><div className="flex gap-2"><select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="glass-field px-2 py-1.5 text-sm">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}</select><input ref={reviewImage} type="file" accept="image/*" className="min-w-0 text-xs" /></div><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Contá cómo fue el trabajo" className="glass-field w-full resize-none px-3 py-2 text-sm" /><button type="button" disabled={busy} onClick={() => review(paidPayment.id)} className="rounded-xl bg-cliente px-3 py-2 text-xs font-semibold text-white">Publicar reseña</button></div> : <button type="button" onClick={() => setReviewFor(paidPayment.id)} className="w-full text-xs font-semibold text-cliente">Escribir reseña verificada</button>)}
  </div>;
}

function EmptyState({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-slate-200 bg-white/45 p-5 text-center text-sm text-slate-500">{text}</p>; }
