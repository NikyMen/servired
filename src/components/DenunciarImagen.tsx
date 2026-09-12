"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";

const MOTIVOS = [
  { valor: "no_es_suyo", etiqueta: "No es un trabajo suyo" },
  { valor: "inapropiado", etiqueta: "Contenido inapropiado" },
  { valor: "enganoso", etiqueta: "Engañoso o no corresponde al oficio" },
  { valor: "otro", etiqueta: "Otro motivo" },
] as const;

/**
 * Botón de denuncia sobre una imagen de muestra.
 *
 * Discreto y en una esquina: está para el caso raro, no para competir con la
 * foto. Sin sesión manda a entrar, porque la denuncia queda a nombre de alguien.
 */
export function DenunciarImagen({ targetType, targetId, puedeDenunciar, volverA }: { targetType: "work_sample_image" | "work_photo"; targetId: string; puedeDenunciar: boolean; volverA: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("no_es_suyo");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function enviar() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/denuncias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, detail }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(data.error ?? "No pudimos enviar la denuncia.");
    setListo(true);
  }

  return <>
    <button
      type="button"
      aria-label="Denunciar esta imagen"
      title="Denunciar esta imagen"
      onClick={() => setOpen(true)}
      className="absolute top-1.5 right-1.5 rounded-full bg-slate-950/45 px-2 py-1 text-[11px] font-semibold text-white opacity-70 backdrop-blur-sm transition-opacity hover:opacity-100"
    >
      Denunciar
    </button>

    {open && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label="Denunciar imagen" className="glass glass-solid animate-sheet-up w-full max-w-md space-y-4 rounded-3xl p-5">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-900">Denunciar esta imagen</p>
              <p className="text-xs text-slate-500">La revisa administración y decide si corresponde dar de baja la cuenta.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button>
          </header>

          {listo ? (
            <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">Gracias. Administración la va a revisar y te avisamos cuando se resuelva.</p>
          ) : !puedeDenunciar ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Para denunciar necesitás una cuenta con el email confirmado: la denuncia queda a nombre de alguien.</p>
              <a href={`/entrar?next=${encodeURIComponent(volverA)}`} className="glass-btn inline-flex px-4 py-2.5 text-sm">Entrar</a>
            </div>
          ) : (
            <div className="space-y-3">
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-slate-900">¿Qué pasa con la imagen?</legend>
                {MOTIVOS.map((motivo) => (
                  <label key={motivo.valor} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
                    <input type="radio" name="motivo" value={motivo.valor} checked={reason === motivo.valor} onChange={() => setReason(motivo.valor)} />
                    {motivo.etiqueta}
                  </label>
                ))}
              </fieldset>
              <textarea rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={1000} placeholder={reason === "otro" ? "Contanos qué pasa (obligatorio)" : "Algo más que quieras contar (opcional)"} className="glass-field w-full resize-none px-3 py-2.5 text-sm" />
              {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <button type="button" disabled={busy} onClick={enviar} className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Enviando…" : "Enviar denuncia"}
              </button>
            </div>
          )}
        </section>
      </div>,
      document.body,
    )}
  </>;
}
