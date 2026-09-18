"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon, XIcon } from "@/components/icons";
import { NoLeidosBadge, useNoLeidos } from "@/components/NoLeidos";
import { formatDateTime } from "@/lib/format";

export const ICONOS_AVISO: Record<string, string> = {
  mensaje: "💬",
  propuesta: "💰",
  propuesta_resuelta: "✅",
  solicitud: "📋",
  solicitud_por_vencer: "⏳",
  kyc: "🪪",
  denuncia: "🚩",
  matricula: "🎓",
};

/**
 * La campanita: mensajes, propuestas, solicitudes y denuncias en un solo lugar.
 *
 * No tiene reloj propio: los avisos vienen en el mismo poll de 12 segundos que
 * el globito de mensajes (`NoLeidosProvider`). Vive en el encabezado, que se ve
 * también en el teléfono, así la barra de abajo no tiene que crecer.
 */
export function Campanita() {
  const { avisos, avisosSinLeer, marcarAvisosLeidos, borrarAvisos } = useNoLeidos();
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
        // En el teléfono ocupa el ancho de la pantalla: anclado al botón quedaba cortado.
        <div className="glass glass-solid animate-reveal-down fixed inset-x-3 top-16 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-2xl shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/60 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Avisos</p>
            {avisos.length > 0 && (
              <button type="button" onClick={() => void borrarAvisos()} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/70 hover:text-red-600">
                Borrar todo
              </button>
            )}
          </div>
          {avisos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No tenés avisos. Acá te contamos de mensajes, propuestas y solicitudes.</p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-white/60 overflow-y-auto overscroll-contain">
              {avisos.map((aviso) => (
                <li key={aviso.id} className={`group relative ${aviso.readAt ? "" : "bg-[rgb(var(--accent-rgb)/0.07)]"}`}>
                  <Link href={aviso.url} onClick={() => setOpen(false)} className="flex gap-3 py-3 pr-11 pl-4 transition-colors hover:bg-white/60">
                    <span aria-hidden className="text-lg leading-none">{ICONOS_AVISO[aviso.kind] ?? "🔔"}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{aviso.title}</span>
                      {aviso.body && <span className="mt-0.5 block truncate text-xs text-slate-600">{aviso.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(aviso.createdAt)}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void borrarAvisos(aviso.id)}
                    aria-label={`Borrar aviso: ${aviso.title}`}
                    title="Borrar"
                    className="absolute top-2.5 right-2.5 rounded-full p-1.5 text-slate-400 transition hover:bg-white hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  >
                    <XIcon width={14} height={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notificaciones" onClick={() => setOpen(false)} className="block shrink-0 border-t border-white/60 px-4 py-2.5 text-center text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-white/60">
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}
