"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Hoja de abajo para confirmar algo que no tiene vuelta atrás (aceptar o
 * rechazar un presupuesto). Toma el foco al abrirse y cierra con Escape o
 * tocando afuera; mientras manda, no se puede tocar dos veces.
 */
export function HojaConfirmar({ titulo, children, confirmar, peligro = false, ocupado, error, onConfirmar, onCerrar }: {
  titulo: string;
  children?: React.ReactNode;
  confirmar: string;
  peligro?: boolean;
  ocupado: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && !ocupado && onCerrar();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [ocupado, onCerrar]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 sm:items-center sm:p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && !ocupado) onCerrar(); }}>
      <section role="alertdialog" aria-modal="true" aria-label={titulo} className="animate-sheet-up w-full max-w-md space-y-4 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
        <h2 className="text-lg font-bold leading-snug text-slate-900">{titulo}</h2>
        {children}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-2">
          <button type="button" autoFocus disabled={ocupado} onClick={onConfirmar} className={`min-h-12 rounded-xl px-4 text-base font-semibold text-white transition-colors disabled:opacity-60 ${peligro ? "bg-red-600 hover:bg-red-700" : "bg-cliente hover:bg-cliente-dark"}`}>
            {ocupado ? "Enviando…" : confirmar}
          </button>
          <button type="button" disabled={ocupado} onClick={onCerrar} className="min-h-12 rounded-xl bg-white px-4 text-base font-semibold text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-60">
            Volver
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
