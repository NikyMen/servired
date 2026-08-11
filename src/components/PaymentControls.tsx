"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatARS } from "@/lib/format";

type Payment = { id: string; amount: number; commission: number; netAmount: number; status: string; checkoutToken: string; review: { id: string } | null };

export function PaymentControls({ conversationId, viewer }: { conversationId: string; viewer: "cliente" | "profesional" }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const reviewImage = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversaciones/${conversationId}/pagos`, { cache: "no-store" });
    if (res.ok) setPayments((await res.json()).payments);
  }, [conversationId]);
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);

  async function createPayment() {
    setBusy(true); setError(null);
    const res = await fetch(`/api/conversaciones/${conversationId}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "No pudimos iniciar el pago."); else { setAmount(""); setOpen(false); await load(); }
    setBusy(false);
  }

  async function review(paymentId: string) {
    setBusy(true); setError(null);
    let imageUrl: string | null = null;
    const file = reviewImage.current?.files?.[0];
    if (file) { const fd = new FormData(); fd.append("file", file); const up = await fetch("/api/upload", { method: "POST", body: fd }); const data = await up.json().catch(() => ({})); if (!up.ok) { setError(data.error ?? "No pudimos subir la imagen."); setBusy(false); return; } imageUrl = data.url; }
    const res = await fetch(`/api/pagos/${paymentId}/resena`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment, imageUrl }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "No pudimos guardar la reseña."); else { setReviewFor(null); setComment(""); await load(); }
    setBusy(false);
  }

  return <div className="border-t border-white/60 bg-white/35 px-3 py-2">
    <div className="flex flex-wrap items-center gap-2">
      {viewer === "cliente" && <button type="button" onClick={() => setOpen(!open)} className="rounded-full bg-[#009ee3] px-3 py-1.5 text-xs font-semibold text-white">Pagar con Mercado Pago · demo</button>}
      {payments.map((p) => <span key={p.id} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{formatARS(p.amount)} · {p.status}{viewer === "profesional" && p.status === "pagado" ? ` · recibís ${formatARS(p.netAmount)}` : ""}</span>)}
    </div>
    {open && <div className="mt-2 flex flex-wrap items-center gap-2"><input type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto en ARS" className="glass-field w-40 px-3 py-2 text-sm" /><button disabled={busy} onClick={createPayment} className="rounded-xl bg-[#009ee3] px-3 py-2 text-xs font-semibold text-white">Generar link</button></div>}
    {viewer === "cliente" && payments.filter((p) => p.status === "pendiente").map((p) => <a key={p.id} href={`/pago-demo/${p.checkoutToken}`} className="mt-2 block text-xs font-semibold text-blue-700 underline">Abrir link de pago por {formatARS(p.amount)}</a>)}
    {viewer === "cliente" && payments.filter((p) => p.status === "pagado" && !p.review).map((p) => reviewFor === p.id ? <div key={p.id} className="mt-2 space-y-2 rounded-xl bg-white/70 p-3"><div className="flex gap-2"><select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="glass-field px-2 py-1.5 text-sm">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}</select><input ref={reviewImage} type="file" accept="image/*" className="text-xs" /></div><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Contá cómo fue el trabajo" className="glass-field w-full resize-none px-3 py-2 text-sm" /><button disabled={busy} onClick={() => review(p.id)} className="rounded-xl bg-cliente px-3 py-2 text-xs font-semibold text-white">Publicar reseña</button></div> : <button key={p.id} onClick={() => setReviewFor(p.id)} className="mt-2 text-xs font-semibold text-cliente">Escribir reseña verificada</button>)}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}

