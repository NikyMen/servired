"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chat, type ChatConversation } from "@/components/Chat";
import { NoLeidosBadge, useNoLeidos } from "@/components/NoLeidos";
import { BellIcon, BellOffIcon, ChatIcon, XIcon } from "@/components/icons";
import { guardarSonido, sonarNotificacion, sonidoActivo } from "@/lib/sonido";
import type { Mode } from "@/lib/types";

/**
 * Botón de mensajes del encabezado (al lado de la campanita, en el celular y
 * en la compu) + popup con el chat completo adentro. Antes era flotante y se
 * encimaba con el de ServiRed IA; ahora abajo a la derecha queda solo la IA.
 * El panel va por portal al <body>: el encabezado tiene backdrop-filter y eso
 * haría que el `fixed` se posicione respecto de él y no de la pantalla.
 */
export function MensajesBoton({ mode }: { mode: Mode }) {
  const pathname = usePathname();
  const isPro = mode === "pro";

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { total, porConversacion } = useNoLeidos();

  // La preferencia vive en localStorage: se lee después de montar para que el
  // HTML del servidor y el del navegador coincidan.
  const [conSonido, setConSonido] = useState(true);
  useEffect(() => setConSonido(sonidoActivo()), []);

  const accent = isPro ? "bg-pro" : "bg-cliente";

  // Cerrar con Escape, como cualquier panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Si aparece un hilo nuevo con el popup abierto hay que volver a pedir la
  // lista: los mensajes de los hilos que ya están los sigue el propio <Chat>.
  const cantidadHilos = Object.keys(porConversacion).length;

  // Los hilos se piden al abrir, no al montar: el popup puede no usarse nunca.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/conversaciones${isPro ? "?como=pro" : ""}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error ?? "No pude cargar tus mensajes.");
          return;
        }
        setConversations(data.conversations as ChatConversation[]);
      } catch {
        if (!cancelled) setError("Se cortó la conexión. Probá de nuevo.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isPro, cantidadHilos]);

  const bandeja = isPro ? "/pro/mensajes" : "/mensajes";
  const enBandeja = pathname.startsWith(bandeja);
  const etiqueta = total > 0 ? `Mensajes, ${total} sin leer` : "Mensajes";
  // Mismo molde que la campanita, para que la fila del encabezado no crezca.
  const boton = `relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/70 hover:text-slate-800 ${enBandeja ? "bg-white/70 text-slate-800" : "text-slate-500"}`;
  const icono = (
    <>
      <ChatIcon width={20} height={20} />
      <NoLeidosBadge n={total} className="absolute -top-0.5 -right-0.5" />
    </>
  );

  // En la bandeja misma el popup no aporta nada: el botón solo marca dónde estás.
  if (enBandeja) {
    return <Link href={bandeja} aria-label={etiqueta} aria-current="page" title="Mensajes" className={boton}>{icono}</Link>;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={etiqueta} aria-expanded={open} title="Mensajes" className={boton}>
        {icono}
      </button>

      {open && createPortal(
        <>
          {/* Telón: en móvil el panel es casi pantalla completa. */}
          <div
            className="animate-fade-in fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-label="Mensajes"
            // Altura fija (no max-h): el chat adentro usa h-full y con max-h no
            // tiene de dónde agarrarse, así que la lista no scrolleaba.
            className="glass glass-solid animate-sheet-up fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden md:inset-auto md:right-6 md:bottom-6 md:h-[min(80vh,680px)] md:w-[min(720px,calc(100vw-3rem))] md:rounded-3xl md:shadow-2xl"
          >
            <header className={`flex shrink-0 items-center gap-3 px-4 pt-[max(.75rem,env(safe-area-inset-top))] pb-3 text-white md:py-3.5 ${accent}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <ChatIcon width={19} height={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Mensajes</p>
                <p className="truncate text-xs text-white/70">
                  {isPro ? "Tus clientes te esperan" : "Coordiná con los profesionales"}
                </p>
              </div>
              <button
                onClick={() => {
                  const proximo = !conSonido;
                  setConSonido(proximo);
                  guardarSonido(proximo);
                  // Al prenderlo suena una vez: además de confirmar el cambio,
                  // es el gesto que le da permiso al navegador para el audio.
                  if (proximo) sonarNotificacion();
                }}
                aria-pressed={conSonido}
                aria-label={conSonido ? "Silenciar avisos" : "Activar sonido de avisos"}
                title={conSonido ? "Silenciar avisos" : "Activar sonido de avisos"}
                className="rounded-full p-1.5 transition-colors hover:bg-white/15"
              >
                {conSonido ? (
                  <BellIcon width={19} height={19} />
                ) : (
                  <BellOffIcon width={19} height={19} className="opacity-60" />
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar mensajes"
                className="rounded-full p-1.5 transition-colors hover:bg-white/15"
              >
                <XIcon width={20} height={20} />
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {error ? (
                <p
                  role="alert"
                  className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800"
                >
                  {error}
                </p>
              ) : conversations === null ? (
                <p className="p-8 text-center text-sm text-slate-400">Cargando tus mensajes…</p>
              ) : (
                <Chat viewer={isPro ? "profesional" : "cliente"} conversations={conversations} embedded />
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
