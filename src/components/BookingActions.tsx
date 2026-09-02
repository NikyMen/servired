"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { formatARS } from "@/lib/format";
import { canRevealPaymentDetails } from "@/lib/payments";

type Proposal = { id: string; amount: number; status: string; expiresAt: string | Date; message?: string | null };

export function BookingActions({ bookingId, status, viewer, proposal, finalPrice, paymentAlias, paymentCvu, paidPaymentId }: { bookingId: string; status: string; viewer: "cliente" | "profesional"; proposal?: Proposal | null; finalPrice?: number | null; paymentAlias?: string | null; paymentCvu?: string | null; paidPaymentId?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<"quote" | "finish" | "review" | null>(null);
  const [amount, setAmount] = useState("");
  const [summary, setSummary] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function action(name: string, details: Record<string, unknown> = {}) { setBusy(true); setError(null); const res = await fetch(`/api/contrataciones/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, ...details }) }); const data = await res.json().catch(() => ({})); if (!res.ok) setError(data.error || "No pudimos actualizar el trabajo."); else { setOpen(null); router.refresh(); } setBusy(false); }
  async function review() { if (!paidPaymentId) return; setBusy(true); const res = await fetch(`/api/pagos/${paidPaymentId}/resena`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) }); const data = await res.json().catch(() => ({})); if (!res.ok) setError(data.error || "No pudimos publicar la reseña."); else { setOpen(null); router.refresh(); } setBusy(false); }

  const activeProposal = proposal?.status === "pending" && new Date(proposal.expiresAt) > new Date() ? proposal : null;
  const paymentDetails = viewer === "cliente" && canRevealPaymentDetails(status) && paymentAlias && paymentCvu ? <div className="select-all rounded-lg bg-white px-3 py-2 text-left text-sm"><p><span className="text-xs text-slate-400">Alias</span><br /><strong>{paymentAlias}</strong></p><p className="mt-2"><span className="text-xs text-slate-400">CVU</span><br /><strong className="font-mono">{paymentCvu}</strong></p></div> : null;
  let content: React.ReactNode = null;
  if (viewer === "cliente" && status === "requested") content = activeProposal ? <div className="space-y-2 text-right"><p className="text-sm font-bold text-slate-900">Propuesta: {formatARS(activeProposal.amount)}</p><p className="text-xs text-slate-500">Vence {new Date(activeProposal.expiresAt).toLocaleString("es-AR")}</p><div className="flex justify-end gap-2"><Button variant="cliente" disabled={busy} onClick={() => action("accept_proposal")} className="!py-1.5 !text-xs">Aceptar</Button><Button variant="outline" disabled={busy} onClick={() => action("reject_proposal")} className="!py-1.5 !text-xs">Rechazar</Button></div></div> : <Button variant="outline" disabled={busy} onClick={() => action("cancel")} className="!py-1.5 !text-xs">Cancelar solicitud</Button>;
  if (viewer === "profesional" && status === "requested") content = activeProposal ? <p className="text-xs font-semibold text-amber-700">Esperando aceptación o rechazo del cliente.</p> : open === "quote" ? <div className="w-64 space-y-2 rounded-2xl bg-emerald-50 p-3"><input type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto en ARS" className="glass-field w-full px-3 py-2 text-sm" /><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Detalle opcional" className="glass-field w-full resize-none px-3 py-2 text-sm" /><Button variant="pro" disabled={busy} onClick={() => action("send_proposal", { amount, message: summary })} className="!py-2 !text-xs">Enviar propuesta (vence en 3 días)</Button></div> : <div className="flex gap-2"><Button variant="pro" onClick={() => setOpen("quote")} className="!py-1.5 !text-xs">Enviar propuesta</Button><Button variant="outline" onClick={() => action("cancel")} className="!py-1.5 !text-xs">No puedo hacerlo</Button></div>;
  if (viewer === "profesional" && status === "in_progress") content = open === "finish" ? <div className="w-64 space-y-2 rounded-2xl bg-emerald-50 p-3"><input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto final" className="glass-field w-full px-3 py-2 text-sm" /><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Qué trabajo realizaste" className="glass-field w-full resize-none px-3 py-2 text-sm" /><Button variant="pro" disabled={busy} onClick={() => action("finish", { finalPrice: amount, workSummary: summary })} className="!py-2 !text-xs">Marcar como trabajo terminado</Button></div> : <Button variant="pro" onClick={() => setOpen("finish")} className="!py-1.5 !text-xs">Marcar como trabajo terminado</Button>;
  if (viewer === "cliente" && status === "finished") content = <div className="space-y-2 text-right"><p className="text-xs text-slate-500">Transferí {formatARS(finalPrice || 0)} usando estos datos</p>{paymentDetails}<Button variant="cliente" disabled={busy} onClick={() => action("report_payment")} className="!py-1.5 !text-xs">Ya realicé el pago</Button></div>;
  if (viewer === "profesional" && status === "payment_reported") content = <Button variant="pro" disabled={busy} onClick={() => action("confirm_payment")} className="!py-1.5 !text-xs">Confirmar recepción del pago</Button>;
  if (viewer === "cliente" && status === "paid_awaiting_review" && paidPaymentId) content = open === "review" ? <div className="w-72 space-y-2 rounded-2xl bg-blue-50 p-3"><select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="glass-field w-full px-3 py-2 text-sm">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}</select><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Contá cómo fue el trabajo" className="glass-field w-full resize-none px-3 py-2 text-sm" /><Button variant="cliente" disabled={busy} onClick={review} className="!py-2 !text-xs">Publicar opinión y finalizar</Button></div> : <Button variant="cliente" onClick={() => setOpen("review")} className="!py-1.5 !text-xs">Calificar y finalizar</Button>;
  return <div className="space-y-2">{status !== "finished" && paymentDetails}{content}{error && <p className="max-w-72 text-xs text-red-600">{error}</p>}</div>;
}
