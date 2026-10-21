"use client";

import { MercadoPagoIcon } from "@/components/icons";
import type { AccionFranja, Franja } from "@/lib/presupuesto";

const FONDO: Record<Franja["tono"], string> = {
  slate: "bg-slate-100/95 text-slate-700 border-slate-200",
  amber: "bg-amber-50/95 text-amber-900 border-amber-200",
  green: "bg-emerald-50/95 text-emerald-900 border-emerald-200",
  blue: "bg-blue-50/95 text-blue-900 border-blue-200",
  mp: "bg-sky-50/95 text-sky-900 border-sky-200",
};
const BOTON: Record<Franja["tono"], string> = {
  slate: "bg-pro text-white hover:bg-pro-dark",
  amber: "bg-amber-500 text-white hover:bg-amber-600",
  green: "bg-pro text-white hover:bg-pro-dark",
  blue: "bg-cliente text-white hover:bg-cliente-dark",
  mp: "bg-[#009EE3] text-white hover:bg-[#0087c2]",
};

/**
 * Debajo del encabezado del hilo: en qué va el acuerdo y, si te toca hacer
 * algo, el botón para hacerlo. Reemplaza al puntito rojo del maletín.
 */
export function FranjaAcuerdo({ franja, onAccion, ocupado = false }: { franja: Franja; onAccion: (accion: AccionFranja) => void; ocupado?: boolean }) {
  return (
    <div role="status" className={`z-10 flex shrink-0 items-center gap-3 border-b px-3 py-2.5 sm:px-4 ${FONDO[franja.tono]}`}>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm font-semibold">{franja.titulo}</p>
        {franja.detalle && <p className="mt-0.5 text-xs opacity-80">{franja.detalle}</p>}
        {franja.progreso !== undefined && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-600/15" role="progressbar" aria-valuenow={franja.progreso} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del plazo">
            <div className="h-full rounded-full bg-pro transition-[width] duration-500" style={{ width: `${franja.progreso}%` }} />
          </div>
        )}
      </div>
      {franja.accion && franja.boton && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onAccion(franja.accion!)}
          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 ${BOTON[franja.tono]}`}
        >
          {franja.accion === "pagar" && <MercadoPagoIcon width={18} height={18} />}
          {ocupado && franja.accion === "pagar" ? "Abriendo…" : franja.boton}
        </button>
      )}
    </div>
  );
}
