"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/icons";
import { NoLeidosBadge, useNoLeidos } from "@/components/NoLeidos";
import { formatDateTime } from "@/lib/format";

const ICONOS: Record<string, string> = {
  mensaje: "💬",
  propuesta: "💰",
  propuesta_resuelta: "✅",
  solicitud: "📋",
  solicitud_por_vencer: "⏳",
  kyc: "🪪",
  denuncia: "🚩",
};

/**
 * La campanita: mensajes, propuestas, solicitudes y denuncias en un solo lugar.
 *
 * No tiene reloj propio: los avisos vienen en el mismo poll de 12 segundos que
 * el globito de mensajes (`NoLeidosProvider`). Vive en el encabezado, que se ve
 * también en el teléfono, así la barra de abajo no tiene que crecer.
 */
export function Campanita() {
  const { avisos, avisosSinLeer, marcarAvisosLeidos } = useNoLeidos();
  const [open, setOpen] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const afuera = (event: MouseEvent) => {
      if (caja.current && !caja.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function alternar() {
    const abriendo = !open;
    setOpen(abriendo);
    // Abrirla es haber visto lo que había.
    if (abriendo && avisosSinLeer > 0) void marcarAvisosLeidos();
  }

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-label={avisosSinLeer > 0 ? `Avisos, ${avisosSinLeer} sin leer` : "Avisos"}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-800"
      >
        <BellIcon width={19} height={19} />
        <NoLeidosBadge n={avisosSinLeer} className="absolute -top-0.5 -right-0.5" label={avisosSinLeer === 1 ? "1 aviso sin leer" : `${avisosSinLeer} avisos sin leer`} />
      </button>

      {open && (
        <div className="glass glass-solid animate-reveal-down absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-xl">
          <p className="border-b border-white/60 px-4 py-3 text-sm font-bold text-slate-900">Avisos</p>
          {avisos.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Todavía no hay nada. Acá te avisamos de mensajes, propuestas y solicitudes.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-white/60 overflow-y-auto">
              {avisos.map((aviso) => (
                <li key={aviso.id}>
                  <Link
                    href={aviso.url}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-white/60 ${aviso.readAt ? "" : "bg-[rgb(var(--accent-rgb)/0.07)]"}`}
                  >
                    <span aria-hidden className="text-lg leading-none">{ICONOS[aviso.kind] ?? "🔔"}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{aviso.title}</span>
                      {aviso.body && <span className="mt-0.5 block truncate text-xs text-slate-600">{aviso.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(aviso.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
