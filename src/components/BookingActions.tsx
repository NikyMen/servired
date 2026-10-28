"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CheckCircleIcon, FileIcon, MercadoPagoIcon, PaperclipIcon, StarIcon } from "@/components/icons";
import { formatARS, formatDateTime } from "@/lib/format";
import { PROPOSAL_TTL_LABEL } from "@/lib/trabajo";
import { dias, fechaCorta } from "@/lib/presupuesto";
import type { DatosTransferencia } from "@/lib/payments";

type Proposal = { id: string; amount: number; status: string; expiresAt: string | Date; message?: string | null; estimatedDays?: number | null };
type PagoInformado = { amount: number; reference: string | null; receiptUrl: string | null; reportedAt: string | Date | null };
type Abierto = "quote" | "finish" | "review" | "accept" | "reject" | "transfer" | "rejectPay" | null;

/** Alto de dedo (44 px) en el celu; en la compu se acomodan en fila. */
const BTN = "min-h-11 w-full !text-sm sm:w-auto";
const FORM = "w-full space-y-2 rounded-2xl p-3 sm:w-72";
const CAMPO = "glass-field w-full px-3 py-2.5 text-base sm:text-sm";

export function BookingActions({ bookingId, status, viewer, proposal, finalPrice, paidPaymentId, mercadoPagoAvailable = false, transferenciaAvailable = false, transferencia = null, pagoInformado = null, onDone, inicial = null }: {
  bookingId: string;
  status: string;
  viewer: "cliente" | "profesional";
  proposal?: Proposal | null;
  finalPrice?: number | null;
  paidPaymentId?: string | null;
  mercadoPagoAvailable?: boolean;
  /** El oferente cargó CVU o alias. Alcanza para cerrar el trabajo sin Mercado Pago. */
  transferenciaAvailable?: boolean;
  /** Los datos para transferir: llegan recién con el trabajo terminado. */
  transferencia?: DatosTransferencia | null;
  /** La transferencia que informó el cliente y espera confirmación. */
  pagoInformado?: PagoInformado | null;
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
  // Si la única vía es transferir, los datos se ven de entrada.
  const soloTransferencia = transferencia !== null && !mercadoPagoAvailable;
  const verTransferencia = open === "transfer" || (soloTransferencia && open === null);

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
  if (viewer === "profesional" && status === "requested") content = activeProposal ? <p className="text-xs font-semibold text-amber-700">Esperando aceptación o rechazo del cliente.</p> : open === "quote" ? <div className={`${FORM} bg-emerald-50`}><input type="number" min="100" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto en ARS" className={CAMPO} /><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={days === "1"} onChange={(e) => setDays(e.target.checked ? "1" : "")} /> Lo termino en el día</label><input type="number" min="1" max="365" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="¿En cuántos días lo terminás?" className={CAMPO} /><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Detalle opcional" className={`${CAMPO} resize-none`} /><Button variant="pro" disabled={busy || Number(days) < 1} onClick={() => action("send_proposal", { amount, message: summary, estimatedDays: Number(days) })} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : `Enviar propuesta (vence en ${PROPOSAL_TTL_LABEL})`}</Button></div> : <div className="flex flex-col gap-2 sm:flex-row"><Button variant="pro" onClick={() => setOpen("quote")} className={BTN}>Enviar propuesta</Button><Button variant="outline" disabled={busy} onClick={() => action("cancel")} className={BTN}>No puedo hacerlo</Button></div>;
  if (viewer === "profesional" && status === "in_progress") content = !mercadoPagoAvailable && !transferenciaAvailable ? <a href="/pro/mi-perfil#cobros" className="text-sm font-semibold text-pro-dark underline">Vinculá Mercado Pago o cargá tu CVU o alias para cerrar y cobrar el trabajo</a> : open === "finish" ? <div className={`${FORM} bg-emerald-50`}><input type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto final" aria-label="Monto final" className={CAMPO} /><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Qué trabajo realizaste" aria-label="Qué trabajo realizaste" className={`${CAMPO} resize-none`} /><Button variant="pro" disabled={busy} onClick={() => action("finish", { finalPrice: amount, workSummary: summary })} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : "Marcar como trabajo terminado"}</Button></div> : <Button variant="pro" onClick={() => setOpen("finish")} className={BTN}>Marcar como trabajo terminado</Button>;
  if (viewer === "cliente" && status === "finished") content = verTransferencia && transferencia
    ? <Transferir datos={transferencia} total={finalPrice || 0} busy={busy} onInformar={(datos) => action("report_payment", datos)} onVolver={soloTransferencia ? undefined : () => setOpen(null)} onError={setError} />
    : <div className="space-y-2 sm:text-right"><p className="text-sm text-slate-600">Total: <b className="text-slate-900">{formatARS(finalPrice || 0)}</b></p>{mercadoPagoAvailable && <button type="button" disabled={busy} onClick={checkout} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#009EE3] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0087c2] disabled:opacity-60 sm:w-auto"><MercadoPagoIcon width={20} height={20} />{busy ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}</button>}{transferencia && <Button variant="outline" disabled={busy} onClick={() => { setError(null); setOpen("transfer"); }} className={`${BTN} sm:ml-2`}>Pagar por transferencia</Button>}{!mercadoPagoAvailable && !transferencia && <p className="text-xs text-amber-700">El profesional tiene que cargar cómo cobrar.</p>}</div>;
  if (viewer === "cliente" && status === "payment_reported") content = <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 sm:max-w-72 sm:text-right">Informaste la transferencia{pagoInformado ? ` de ${formatARS(pagoInformado.amount)}` : ""}. Falta que el oferente confirme que le llegó; después vas a poder calificarlo.</p>;
  if (viewer === "profesional" && status === "payment_reported") content = open === "rejectPay"
    ? <div className={`${FORM} bg-red-50`}><p className="text-sm font-bold text-slate-900">¿No te llegó la transferencia?</p><p className="text-xs text-slate-600">El trabajo vuelve a «falta el pago» y le avisamos para que lo revise.</p><textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={80} placeholder="Qué pasó (opcional)" aria-label="Qué pasó" className={`${CAMPO} resize-none`} /><button type="button" disabled={busy} onClick={() => action("reject_payment", { reason: summary })} className="min-h-11 w-full rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Enviando…" : "No me llegó"}</button><Button variant="outline" disabled={busy} onClick={() => setOpen(null)} className="min-h-11 w-full !text-sm">Volver</Button></div>
    : <div className={`${FORM} bg-amber-50`}><p className="text-sm font-bold text-slate-900">Te informaron una transferencia{pagoInformado ? ` de ${formatARS(pagoInformado.amount)}` : ""}</p>{pagoInformado?.reportedAt && <p className="text-xs text-slate-500">El {formatDateTime(pagoInformado.reportedAt)}</p>}{pagoInformado?.reference && <p className="text-sm text-slate-700">Operación: <b className="font-mono">{pagoInformado.reference}</b></p>}{pagoInformado?.receiptUrl && <a href={pagoInformado.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pro-dark underline"><FileIcon width={16} height={16} />Ver comprobante</a>}<p className="text-xs text-slate-600">Fijate en tu cuenta antes de confirmar: el comprobante solo no garantiza que la plata llegó.</p><Button variant="pro" disabled={busy} onClick={() => action("confirm_payment")} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : "Sí, me llegó"}</Button><Button variant="outline" disabled={busy} onClick={() => { setSummary(""); setOpen("rejectPay"); }} className="min-h-11 w-full !text-sm">No me llegó</Button></div>;
  if (viewer === "cliente" && status === "paid_awaiting_review" && paidPaymentId) content = open === "review" ? <div className={`${FORM} bg-blue-50`}><div className="flex justify-center gap-1" role="radiogroup" aria-label="Calificación">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} onClick={() => setRating(n)} className={`grid size-11 place-items-center rounded-xl transition-colors ${n <= rating ? "text-amber-400" : "text-slate-300"} hover:bg-white/70`}><StarIcon width={30} height={30} /></button>)}</div><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Contá cómo fue el trabajo" aria-label="Contá cómo fue el trabajo" className={`${CAMPO} resize-none`} /><Button variant="cliente" disabled={busy || !rating} onClick={review} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : rating ? "Publicar opinión y finalizar" : "Elegí las estrellas"}</Button></div> : <Button variant="cliente" onClick={() => setOpen("review")} className={BTN}>Calificar y finalizar</Button>;
  return <div className="space-y-2">{content}{error && <p role="alert" className="text-xs text-red-600 sm:max-w-72">{error}</p>}</div>;
}

/**
 * Pago directo (P2P): el cliente ve a quién transferir, lo hace desde su banco
 * o billetera y vuelve a cargar el comprobante o el número de operación.
 */
function Transferir({ datos, total, busy, onInformar, onVolver, onError }: { datos: DatosTransferencia; total: number; busy: boolean; onInformar: (datos: { receiptUrl: string | null; reference: string }) => void; onVolver?: () => void; onError: (error: string | null) => void }) {
  const [comprobante, setComprobante] = useState<{ url: string; name: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [reference, setReference] = useState("");
  const listo = Boolean(comprobante) || reference.trim().length >= 4;

  async function subir(file: File | undefined) {
    if (!file) return;
    setSubiendo(true); onError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "No pudimos subir el comprobante.");
      setComprobante({ url: data.url, name: file.name });
    } catch (cause) { onError(cause instanceof Error && cause.message !== "Failed to fetch" ? cause.message : "No hay conexión. Probá de nuevo."); }
    setSubiendo(false);
  }

  return (
    <div className={`${FORM} bg-blue-50 sm:w-80`}>
      <p className="text-sm font-bold text-slate-900">Transferí {formatARS(total)} a</p>
      <div className="space-y-2 rounded-xl bg-white p-3 text-left">
        <Copiable rotulo={datos.kind === "cvu" ? "CVU / CBU" : "Alias"} valor={datos.handle} mono={datos.kind === "cvu"} />
        <Copiable rotulo="Monto" valor={String(total)} mostrar={formatARS(total)} />
        <div><p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Titular</p><p className="text-sm font-semibold text-slate-900">{datos.holder}</p></div>
      </div>
      <p className="text-xs text-slate-600">Antes de confirmar en tu banco, chequeá que el titular coincida. La plata va directo al oferente.</p>
      <p className="pt-1 text-sm font-semibold text-slate-900">Después, cargá la transferencia</p>
      <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm ${comprobante ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
        {comprobante ? <CheckCircleIcon width={18} height={18} className="shrink-0" /> : <PaperclipIcon width={18} height={18} className="shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{subiendo ? "Subiendo…" : comprobante ? comprobante.name : "Subir comprobante (foto o PDF)"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={subiendo || busy} onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} placeholder={comprobante ? "N.º de operación (opcional)" : "N.º de operación"} aria-label="Número de operación" className={CAMPO} />
      <Button variant="cliente" disabled={busy || subiendo || !listo} onClick={() => onInformar({ receiptUrl: comprobante?.url ?? null, reference })} className="min-h-11 w-full !text-sm">{busy ? "Enviando…" : listo ? "Ya transferí, avisarle" : "Subí el comprobante o el n.º"}</Button>
      {onVolver && <Button variant="outline" disabled={busy} onClick={onVolver} className="min-h-11 w-full !text-sm">Volver</Button>}
    </div>
  );
}

function Copiable({ rotulo, valor, mostrar, mono = false }: { rotulo: string; valor: string; mostrar?: string; mono?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(valor); setCopiado(true); window.setTimeout(() => setCopiado(false), 1600); } catch { /* Sin permiso: el texto igual se puede seleccionar. */ }
  }
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{rotulo}</p><p className={`select-all break-all text-sm font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{mostrar ?? valor}</p></div>
      <button type="button" onClick={copiar} aria-label={`Copiar ${rotulo.toLowerCase()}`} className="min-h-9 shrink-0 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200">{copiado ? "¡Copiado!" : "Copiar"}</button>
    </div>
  );
}
