"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";

const MOTIVOS = [
  { valor: "acoso", etiqueta: "Acoso, insultos o amenazas" },
  { valor: "estafa", etiqueta: "Intento de estafa o pedido de datos" },
  { valor: "spam", etiqueta: "Spam o publicidad" },
  { valor: "inapropiado", etiqueta: "Contenido inapropiado" },
  { valor: "otro", etiqueta: "Otro motivo" },
] as const;

/**
 * Denuncia de un chat. Se abre desde el menú del encabezado del hilo; el
 * servidor congela los últimos mensajes para que administración vea qué pasó.
 */
export function DenunciarConversacion({ conversationId, withName, onClose }: { conversationId: string; withName: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>("acoso");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function enviar() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/denuncias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "conversation", targetId: conversationId, reason, detail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setError(data.error ?? "No pudimos enviar la denuncia.");
      setListo(true);
    } catch {
      setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Denunciar conversación" className="glass glass-solid animate-sheet-up max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900">Denunciar a {withName}</p>
            <p className="text-xs text-slate-500">Administración revisa los últimos mensajes de este chat y decide. {withName} no se entera de quién denunció.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button>
        </header>

        {listo ? (
          <div className="space-y-3">
            <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">Gracias por avisar. Administración la va a revisar y te avisamos por la campanita cuando se resuelva.</p>
            <button type="button" onClick={onClose} className="glass-btn w-full px-4 py-2.5 text-sm">Listo</button>
          </div>
        ) : (
          <div className="space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="mb-1 text-sm font-medium text-slate-900">¿Qué pasó?</legend>
              {MOTIVOS.map((motivo) => (
                <label key={motivo.valor} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 transition-colors ${reason === motivo.valor ? "bg-red-50 ring-red-200" : "bg-white/70 ring-transparent"}`}>
                  <input type="radio" name="motivo-chat" value={motivo.valor} checked={reason === motivo.valor} onChange={() => setReason(motivo.valor)} />
                  {motivo.etiqueta}
                </label>
              ))}
            </fieldset>
            <textarea rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={1000} placeholder={reason === "otro" ? "Contanos qué pasó (obligatorio)" : "Algo más que quieras contar (opcional)"} className="glass-field w-full resize-none px-3 py-2.5 text-base sm:text-sm" />
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <button type="button" disabled={busy} onClick={enviar} className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? "Enviando…" : "Enviar denuncia"}
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
