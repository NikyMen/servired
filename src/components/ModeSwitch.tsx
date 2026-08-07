"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MODE_SWITCH_EVENT } from "@/components/ModeTransition";
import type { Mode } from "@/lib/types";

/**
 * Interruptor para pasar de "busco" (azul) a "ofrezco" (verde).
 *
 * Es un Link, no un botón: cambiar de modo es navegar a la otra mitad de la app,
 * y así funciona el clic del medio, "abrir en pestaña nueva" y el prefetch.
 * role="switch" + aria-checked para que un lector de pantalla lo cante como lo
 * que parece: un interruptor de dos posiciones.
 *
 * Visualmente es un control segmentado de vidrio: dos mitades y una píldora
 * que se desliza debajo de la activa (ver .mode-switch en globals.css). La
 * píldora se mueve APENAS tocás, sin esperar a que navegue: la navegación
 * tarda cientos de milisegundos y un interruptor que se queda quieto ese rato
 * se siente roto.
 */
export function ModeSwitch({
  mode,
  className = "",
}: {
  mode: Mode;
  className?: string;
}) {
  const isPro = mode === "pro";
  // Cruzar de lado no pide cuenta: el panel profesional se puede mirar como
  // invitado. Antes, sin sesión de pro, esto te desviaba a /crear-cuenta y el
  // interruptor no cambiaba de modo, que era exactamente lo que prometía.
  const target = isPro ? "/" : "/pro";

  // Dónde está la píldora. Arranca donde dice el modo real y se adelanta al
  // clic; si la navegación se cancela (o volvés con el botón atrás), el
  // efecto la devuelve a su lugar.
  const [index, setIndex] = useState(isPro ? 1 : 0);
  useEffect(() => setIndex(isPro ? 1 : 0), [isPro]);

  // Un solo interruptor para todos los tamaños: en móvil se achica solo.
  const pad = "px-2.5 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-xs";

  /**
   * Mueve la píldora y le avisa a ModeTransition que arranque el barrido.
   * Sólo clic primario sin modificadores: con Ctrl/⌘ o rueda se abre en otra
   * pestaña y esta página no navega, así que no hay nada que anunciar.
   */
  const anunciarCambio = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    setIndex(isPro ? 0 : 1);
    window.dispatchEvent(
      new CustomEvent(MODE_SWITCH_EVENT, {
        // `to` va en el detalle porque el barrido arranca con el clic, antes
        // de saber en qué ruta se termina aterrizando.
        detail: { to: isPro ? "cliente" : "pro" },
      }),
    );
  };

  return (
    <Link
      href={target}
      onClick={anunciarCambio}
      role="switch"
      aria-checked={isPro}
      aria-label={isPro ? "Cambiar a modo cliente: buscar servicios" : "Cambiar a modo profesional: ofrecer servicios"}
      title={isPro ? "Pasar a buscar servicios" : "Pasar a ofrecer servicios"}
      data-side={index === 1 ? "pro" : "cliente"}
      style={{ "--switch-i": index } as React.CSSProperties}
      className={`mode-switch glass glass-thin ${className}`}
    >
      <span className="mode-switch-pill" aria-hidden />
      <span
        className={`mode-switch-seg ${pad} font-semibold ${
          index === 0 ? "text-white" : "text-slate-500"
        }`}
      >
        Busco
      </span>
      <span
        className={`mode-switch-seg ${pad} font-semibold ${
          index === 1 ? "text-white" : "text-slate-500"
        }`}
      >
        Ofrezco
      </span>
    </Link>
  );
}
