"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { MercadoPagoIcon, StarIcon } from "@/components/icons";
import { formatARS, formatDateTime } from "@/lib/format";
import { PROPOSAL_TTL_LABEL } from "@/lib/trabajo";
import { dias, fechaCorta } from "@/lib/presupuesto";

type Proposal = { id: string; amount: number; status: string; expiresAt: string | Date; message?: string | null; estimatedDays?: number | null };
type Abierto = "quote" | "finish" | "review" | "accept" | "reject" | null;

/** Alto de dedo (44 px) en el celu; en la compu se acomodan en fila. */
const BTN = "min-h-11 w-full !text-sm sm:w-auto";
const FORM = "w-full space-y-2 rounded-2xl p-3 sm:w-72";
const CAMPO = "glass-field w-full px-3 py-2.5 text-base sm:text-sm";

export function BookingActions({ bookingId, status, viewer, proposal, finalPrice, paidPaymentId, mercadoPagoAvailable = false, onDone, inicial = null }: {
  bookingId: string;
  status: string;
  viewer: "cliente" | "profesional";
  proposal?: Proposal | null;
  finalPrice?: number | null;
  paidPaymentId?: string | null;
  mercadoPagoAvailable?: boolean;
  /** Qué hacer al terminar bien una acción. En el chat recarga el acuerdo; si no, se refresca la página. */
  onDone?: () => void | Promise<void>;
  /** Abre directo el formulario de cerrar o el de calificar (lo usa la franja del chat). */
  inicial?: "finish" | "review" | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Abierto>(inicial);
  const [amount, setAmount] = useState("");
  const [summary, setSummary] = useState("");
  const [days, setDays] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function listo() { setOpen(null); if (onDone) await onDone(); else router.refresh(); }
  async function action(name: string, details: Record<string, unknown> = {}) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/contrataciones/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, ...details }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "No pudimos actualizar el trabajo."); if (res.status === 409 && onDone) await onDone(); }
      else await listo();
    } catch { setError("No hay conexión. Probá de nuevo."); }
    setBusy(false);
  }
  async function review() {
    if (!paidPaymentId || !rating) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/pagos/${paidPaymentId}/resena`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "No pudimos publicar la reseña."); else await listo();
    } catch { setError("No hay conexión. Probá de nuevo."); }
    setBusy(false);
  }
  async function checkout() { setBusy(true); setError(null); try { const res = await fetch(`/api/contrataciones/${bookingId}/checkout`, { method: "POST" }); const data = await res.json(); if (!res.ok || !data.url) throw new Error(data.error || "No pudimos iniciar el pago."); window.location.assign(data.url); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos iniciar el pago."); setBusy(false); } }

  const activeProposal = proposal?.status === "pending" && new Date(proposal.expiresAt) > new Date() ? proposal : null;
  const fin = activeProposal?.estimatedDays ? new Date(Date.now() + activeProposal.estimatedDays * 86_400_000) : null;
  let content: React.ReactNode = null;

  if (viewer === "cliente" && status === "requested") {
    if (!activeProposal) content = <Button variant="outline" disabled={busy} onClick={() => action("cancel")} className={BTN}>Cancelar acuerdo</Button>;
    else if (open === "accept") content = <div className={`${FORM} bg-blue-50`}><p className="text-sm font-bold text-slate-900">¿Aceptás {formatARS(activeProposal.amount)}{activeProposal.estimatedDays ? ` por ${dias(activeProposal.estimatedDays)}` : ""}?</p>{fin && <p className="text-xs text-slate-600">El plazo arranca hoy y termina el {fechaCorta(fin)}.</p>}<Button variant="cliente" disabled={busy} onClick={() => action("accept_proposal")} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : "Sí, aceptar"}</Button><Button variant="outline" disabled={busy} onClick={() => setOpen(null)} className="min-h-11 w-full !text-sm">Volver</Button></div>;
    else if (open === "reject") content = <div className={`${FORM} bg-red-50`}><p className="text-sm font-bold text-slate-900">¿Rechazás el presupuesto de {formatARS(activeProposal.amount)}?</p><p className="text-xs text-slate-600">Le avisamos para que pueda mandarte otro.</p><button type="button" disabled={busy} onClick={() => action("reject_proposal")} className="min-h-11 w-full rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Enviando…" : "Rechazar"}</button><Button variant="outline" disabled={busy} onClick={() => setOpen(null)} className="min-h-11 w-full !text-sm">Volver</Button></div>;
    else content = <div className="space-y-2 sm:text-right"><p className="text-sm font-bold text-slate-900">Propuesta: {formatARS(activeProposal.amount)}</p>{activeProposal.estimatedDays && <p className="text-xs font-semibold text-slate-600">{dias(activeProposal.estimatedDays)} de trabajo desde que la aceptás</p>}<p className="text-xs text-slate-500">Vence {formatDateTime(activeProposal.expiresAt)}</p><div className="grid grid-cols-[1fr_1.4fr] gap-2 sm:flex sm:justify-end"><Button variant="outline" disabled={busy} onClick={() => setOpen("reject")} className={BTN}>Rechazar</Button><Button variant="cliente" disabled={busy} onClick={() => setOpen("accept")} className={BTN}>Aceptar</Button></div></div>;
  }
  if (viewer === "profesional" && status === "requested") content = activeProposal ? <p className="text-xs font-semibold text-amber-700">Esperando aceptación o rechazo del cliente.</p> : open === "quote" ? <div className={`${FORM} bg-emerald-50`}><input type="number" min="100" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto en ARS" className={CAMPO} /><input type="number" min="1" max="365" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="¿En cuántos días lo terminás?" className={CAMPO} /><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Detalle opcional" className={`${CAMPO} resize-none`} /><Button variant="pro" disabled={busy || Number(days) < 1} onClick={() => action("send_proposal", { amount, message: summary, estimatedDays: Number(days) })} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : `Enviar propuesta (vence en ${PROPOSAL_TTL_LABEL})`}</Button></div> : <div className="flex flex-col gap-2 sm:flex-row"><Button variant="pro" onClick={() => setOpen("quote")} className={BTN}>Enviar propuesta</Button><Button variant="outline" disabled={busy} onClick={() => action("cancel")} className={BTN}>No puedo hacerlo</Button></div>;
  if (viewer === "profesional" && status === "in_progress") content = !mercadoPagoAvailable ? <a href="/pro/mi-perfil#mercado-pago" className="text-sm font-semibold text-pro-dark underline">Vinculá Mercado Pago para cerrar y cobrar el trabajo</a> : open === "finish" ? <div className={`${FORM} bg-emerald-50`}><input type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto final" aria-label="Monto final" className={CAMPO} /><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Qué trabajo realizaste" aria-label="Qué trabajo realizaste" className={`${CAMPO} resize-none`} /><Button variant="pro" disabled={busy} onClick={() => action("finish", { finalPrice: amount, workSummary: summary })} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : "Marcar como trabajo terminado"}</Button></div> : <Button variant="pro" onClick={() => setOpen("finish")} className={BTN}>Marcar como trabajo terminado</Button>;
  if (viewer === "cliente" && status === "finished") content = <div className="space-y-2 sm:text-right"><p className="text-sm text-slate-600">Total: <b className="text-slate-900">{formatARS(finalPrice || 0)}</b></p>{mercadoPagoAvailable ? <button type="button" disabled={busy} onClick={checkout} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#009EE3] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0087c2] disabled:opacity-60 sm:w-auto"><MercadoPagoIcon width={20} height={20} />{busy ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}</button> : <p className="text-xs text-amber-700">El profesional tiene que vincular Mercado Pago para cobrar.</p>}</div>;
  if (viewer === "profesional" && status === "payment_reported") content = <Button variant="pro" disabled={busy} onClick={() => action("confirm_payment")} className={BTN}>{busy ? "Enviando…" : "Confirmar recepción del pago"}</Button>;
  if (viewer === "cliente" && status === "paid_awaiting_review" && paidPaymentId) content = open === "review" ? <div className={`${FORM} bg-blue-50`}><div className="flex justify-center gap-1" role="radiogroup" aria-label="Calificación">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} onClick={() => setRating(n)} className={`grid size-11 place-items-center rounded-xl transition-colors ${n <= rating ? "text-amber-400" : "text-slate-300"} hover:bg-white/70`}><StarIcon width={30} height={30} /></button>)}</div><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Contá cómo fue el trabajo" aria-label="Contá cómo fue el trabajo" className={`${CAMPO} resize-none`} /><Button variant="cliente" disabled={busy || !rating} onClick={review} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : rating ? "Publicar opinión y finalizar" : "Elegí las estrellas"}</Button></div> : <Button variant="cliente" onClick={() => setOpen("review")} className={BTN}>Calificar y finalizar</Button>;
  return <div className="space-y-2">{content}{error && <p role="alert" className="text-xs text-red-600 sm:max-w-72">{error}</p>}</div>;
}
