"use client";

import Link from "next/link";
import { MODE_SWITCH_EVENT } from "@/components/ModeTransition";
import type { Mode } from "@/lib/types";

/**
 * Interruptor para pasar de "busco" (azul) a "ofrezco" (verde).
 *
 * Es un Link, no un botón: cambiar de modo es navegar a la otra mitad de la app,
 * y así funciona el clic del medio, "abrir en pestaña nueva" y el prefetch.
 * role="switch" + aria-checked para que un lector de pantalla lo cante como lo
 * que parece: un interruptor de dos posiciones.
 */
export function ModeSwitch({
  mode,
  className = "",
  size = "md",
}: {
  mode: Mode;
  className?: string;
  size?: "sm" | "md";
}) {
  const isPro = mode === "pro";
  const target = isPro ? "/" : "/pro";

  const track = size === "sm" ? "h-6 w-11" : "h-7 w-[52px]";
  const knob = size === "sm" ? "size-4" : "size-5";
  const knobOn = size === "sm" ? "translate-x-5" : "translate-x-6";
  const label = size === "sm" ? "text-[10px]" : "text-xs";

  /**
   * Le avisa a ModeTransition desde dónde nace la onda. Se emite el centro
   * del interruptor y no el punto exacto del clic: si tocaste el borde de la
   * cápsula la onda igual sale "del switch", que es lo que se siente natural.
   * Sólo clic primario sin modificadores: con Ctrl/⌘ o rueda se abre en otra
   * pestaña y esta página no navega, así que no hay onda que anunciar.
   */
  const announceOrigin = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const r = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent(MODE_SWITCH_EVENT, {
        detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      }),
    );
  };

  return (
    <Link
      href={target}
      onClick={announceOrigin}
      role="switch"
      aria-checked={isPro}
      aria-label={isPro ? "Cambiar a modo cliente: buscar servicios" : "Cambiar a modo profesional: ofrecer servicios"}
      title={isPro ? "Pasar a buscar servicios" : "Pasar a ofrecer servicios"}
      className={`group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-[box-shadow,scale] duration-150 hover:shadow-md active:scale-95 ${className}`}
    >
      <span
        className={`${label} font-semibold transition-colors ${
          isPro ? "text-slate-400" : "text-cliente"
        }`}
      >
        Busco
      </span>

      <span
        className={`relative ${track} shrink-0 rounded-full transition-colors duration-300 ${
          isPro ? "bg-pro" : "bg-cliente"
        }`}
      >
        {/* El scale-x del active es el "squash" clásico de los switch de iOS:
            la perilla se estira apenas mientras el dedo está apoyado. */}
        <span
          className={`absolute top-1/2 left-1 ${knob} -translate-y-1/2 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-active:scale-x-125 ${
            isPro ? knobOn : "translate-x-0"
          }`}
        />
      </span>

      <span
        className={`${label} font-semibold transition-colors ${
          isPro ? "text-pro" : "text-slate-400"
        }`}
      >
        Ofrezco
      </span>
    </Link>
  );
}
