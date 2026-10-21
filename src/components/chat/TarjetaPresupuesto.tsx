"use client";

import { forwardRef } from "react";
import { type PropuestaVista, type Viewer, ars, dias, estadoPropuesta, fechaCorta } from "@/lib/presupuesto";

const PILL = {
  pendiente: { clase: "bg-amber-100 text-amber-800", texto: "Pendiente" },
  aceptado: { clase: "bg-emerald-100 text-emerald-800", texto: "Aceptado" },
  rechazado: { clase: "bg-slate-100 text-slate-600", texto: "Rechazado" },
  vencido: { clase: "bg-slate-100 text-slate-600", texto: "Vencido" },
} as const;

/**
 * El presupuesto dentro del chat, con su estado de verdad (sale de la
 * propuesta, no del texto del mensaje). El cliente lo acepta o rechaza acá
 * mismo mientras está pendiente; el oferente ve la misma tarjeta sin botones.
 */
export const TarjetaPresupuesto = forwardRef<HTMLElement, {
  propuesta: PropuestaVista;
  viewer: Viewer;
  hora: string;
  resaltada?: boolean;
  /** Solo llegan si el cliente puede responder ahora. */
  onAceptar?: () => void;
  onRechazar?: () => void;
}>(function TarjetaPresupuesto({ propuesta: p, viewer, hora, resaltada = false, onAceptar, onRechazar }, ref) {
  const estado = estadoPropuesta(p);
  const pill = PILL[estado];
  const apagado = estado === "rechazado" || estado === "vencido";
  const pie = estado === "pendiente" ? `Vence el ${fechaCorta(p.expiresAt)}` : estado === "aceptado" ? "Aceptado" : estado === "rechazado" ? "Se rechazó" : "Venció sin respuesta";
  const responde = viewer === "cliente" && estado === "pendiente" && onAceptar && onRechazar;
  return (
    <article
      ref={ref}
      aria-label={`Presupuesto de ${ars(p.amount)}, ${pill.texto}`}
      className={`w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-shadow duration-300 ${resaltada ? "ring-4 ring-amber-400" : "ring-slate-200"}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Presupuesto</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.clase}`}>{pill.texto}</span>
      </div>
      <div className="space-y-1.5 px-4 pb-3 pt-1">
        <p className={`text-[1.75rem] font-bold leading-tight tracking-tight tabular-nums ${apagado ? "text-slate-400 line-through" : "text-slate-900"}`}>{ars(p.amount)}</p>
        {p.estimatedDays ? (
          <p className="text-sm text-slate-600">
            <b className="font-semibold text-slate-900">{dias(p.estimatedDays)}</b> de trabajo · {estado === "pendiente" ? (viewer === "cliente" ? "arrancan cuando lo aceptás" : "arrancan cuando lo acepte") : estado === "aceptado" ? "desde que se aceptó" : "propuestos"}
          </p>
        ) : null}
        {p.message && <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{p.message}</p>}
      </div>
      <div className="flex justify-between gap-2 px-4 pb-3 text-[11px] text-slate-400">
        <span>{pie}</span>
        <span>{hora}</span>
      </div>
      {responde && (
        <div className="grid grid-cols-[1fr_1.4fr] gap-2 px-4 pb-4">
          <button type="button" onClick={onRechazar} className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50">Rechazar</button>
          <button type="button" onClick={onAceptar} className="min-h-11 rounded-xl bg-cliente px-3 text-sm font-semibold text-white transition-colors hover:bg-cliente-dark">Aceptar</button>
        </div>
      )}
    </article>
  );
});
