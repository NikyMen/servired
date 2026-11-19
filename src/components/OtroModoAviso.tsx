"use client";

import Link from "next/link";
import { MODE_SWITCH_EVENT } from "@/components/ModeTransition";
import { useNoLeidos, type OtroModo } from "@/components/NoLeidos";
import type { Mode } from "@/lib/types";

/** La bandeja del otro lado. Con un solo chat pendiente, abre ese chat. */
export function bandejaOtroModo(mode: Mode, otro: OtroModo) {
  const base = mode === "pro" ? "/mensajes" : "/pro/mensajes";
  return otro.conversaciones.length === 1 ? `${base}?conversacion=${otro.conversaciones[0]}` : base;
}

/**
 * Cruzar de lado desde un aviso: misma cortina que el interruptor.
 * Sólo con clic primario sin modificadores; si no, se abre en otra pestaña.
 */
export function anunciarCruce(to: Mode, e?: React.MouseEvent) {
  if (e && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
  window.dispatchEvent(new CustomEvent(MODE_SWITCH_EVENT, { detail: { to } }));
}

/** Modo al que pertenece una ruta: /pro… es Ofrezco, el resto Busco. */
export function modoDeRuta(url: string): Mode {
  const path = url.split(/[?#]/)[0];
  return path === "/pro" || path.startsWith("/pro/") ? "pro" : "cliente";
}

/**
 * Franja "Tenés chats sin leer en Ofrezco/Busco". Va arriba de la bandeja y
 * del popup de mensajes: el globito ya suma los dos lados, y esto dice dónde
 * están los que no se ven en esta lista.
 */
export function OtroModoAviso({ mode, onIr }: { mode: Mode; onIr?: () => void }) {
  const { otroModo } = useNoLeidos();
  if (otroModo.total <= 0) return null;
  const destino: Mode = mode === "pro" ? "cliente" : "pro";
  const lado = destino === "pro" ? "Ofrezco" : "Busco";
  const color = destino === "pro" ? "bg-pro hover:bg-pro-dark" : "bg-cliente hover:bg-cliente-dark";
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
      <span>
        {otroModo.total === 1 ? "Tenés 1 chat sin leer" : `Tenés ${otroModo.total} chats sin leer`} en <strong>{lado}</strong>.
      </span>
      <Link
        href={bandejaOtroModo(mode, otroModo)}
        onClick={(e) => {
          anunciarCruce(destino, e);
          onIr?.();
        }}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors ${color}`}
      >
        Ver en {lado}
      </Link>
    </div>
  );
}
