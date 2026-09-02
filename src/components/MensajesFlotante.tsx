"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Chat, type ChatConversation } from "@/components/Chat";
import { NoLeidosBadge, useNoLeidos } from "@/components/NoLeidos";
import { BellIcon, BellOffIcon, ChatIcon, XIcon } from "@/components/icons";
import { guardarSonido, sonarNotificacion, sonidoActivo } from "@/lib/sonido";
import type { Mode } from "@/lib/types";

/**
 * Botón flotante de mensajes + popup con el chat completo adentro.
 * Es el hermano del de ServiRed IA: misma píldora (el ancho compartido vive
 * en la clase w-40 de los dos), apilado arriba suyo, y abre un panel en la
 * misma esquina en vez de navegar a la bandeja.
 */
export function MensajesFlotante({ mode }: { mode: Mode }) {
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
  const accentHover = isPro ? "hover:bg-pro-dark" : "hover:bg-cliente-dark";

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

  // En la bandeja misma no aporta nada: ya está el chat a pantalla completa.
  if (pathname.startsWith(isPro ? "/pro/mensajes" : "/mensajes")) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={total > 0 ? `Abrir mensajes, ${total} sin leer` : "Abrir mensajes"}
          title="Mensajes"
          className={`fixed right-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-40 flex size-13 items-center justify-center rounded-full text-white shadow-lg transition-all hover:shadow-xl active:scale-95 md:bottom-22 ${accent} ${accentHover}`}
        >
          <span className="relative">
            <ChatIcon width={20} height={20} />
            {/* Colgado del ícono y fuera de la píldora: el ancho es fijo (w-40,
                compartido con el botón de ServiRed IA) y no puede crecer. */}
            <NoLeidosBadge n={total} className="absolute -top-2.5 -right-3 ring-white/40" />
          </span>
        </button>
      )}

      {open && (
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
            className="glass glass-solid animate-sheet-up fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-3xl md:inset-auto md:right-6 md:bottom-6 md:max-h-[80vh] md:w-[640px]"
          >
            <header className={`flex items-center gap-3 px-4 py-3.5 text-white ${accent}`}>
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

            <div className="min-h-0 flex-1 overflow-hidden p-3">
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
                <Chat viewer={isPro ? "profesional" : "cliente"} conversations={conversations} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
