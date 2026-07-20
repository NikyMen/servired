"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SparklesIcon, XIcon, SendIcon } from "@/components/icons";
import type { Mode } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Cuánto puede salir destapar una cañería?",
  "Se me cortó la luz en media casa, ¿a quién llamo?",
  "¿Qué le pregunto a un pintor antes de contratarlo?",
];

/** Botón flotante + panel de ServiRed IA. Habla con /api/ia, que va a DeepSeek. */
export function AsistenteIA({ mode }: { mode: Mode }) {
  const isPro = mode === "pro";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const accent = isPro ? "bg-pro" : "bg-cliente";
  const accentHover = isPro ? "hover:bg-pro-dark" : "hover:bg-cliente-dark";
  const accentText = isPro ? "text-pro" : "text-cliente";
  const focusRing = isPro
    ? "focus:border-pro focus:ring-pro/20"
    : "focus:border-cliente focus:ring-cliente/20";

  // Seguir el final del hilo mientras escribe.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Cerrar con Escape, como cualquier panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Si se desmonta a mitad de una respuesta, cortar el fetch.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || streaming) return;

    const history = [...messages, { role: "user" as const, content: clean }];
    setMessages(history);
    setInput("");
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No pude responder. Probá de nuevo.");
        return;
      }

      // Burbuja vacía que se va llenando con el stream.
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("Se cortó la conexión con la IA. Probá de nuevo.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      {/* Botón flotante. bottom-24 en móvil: arriba de la barra de pestañas. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir ServiRed IA"
          className={`fixed right-4 bottom-24 z-40 flex w-40 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 md:bottom-6 ${accent} ${accentHover}`}
        >
          <SparklesIcon width={20} height={20} />
          ServiRed IA
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
            aria-label="ServiRed IA"
            className="animate-sheet-up fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:inset-auto md:right-6 md:bottom-6 md:h-[560px] md:w-[400px]"
          >
            <header className={`flex items-center gap-3 px-4 py-3.5 text-white ${accent}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <SparklesIcon width={19} height={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">ServiRed IA</p>
                <p className="truncate text-xs text-white/70">
                  {streaming ? "Escribiendo…" : "Te ayudo a resolver tu consulta"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar ServiRed IA"
                className="rounded-full p-1.5 transition-colors hover:bg-white/15"
              >
                <XIcon width={20} height={20} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="py-6 text-center">
                  <LogoMark size={44} className="mx-auto" />
                  <p className="mt-3 font-bold text-slate-900">¿En qué te doy una mano?</p>
                  <p className="mx-auto mt-1 max-w-[260px] text-sm text-slate-500">
                    Contame qué necesitás y te digo qué profesional buscar y qué preguntarle.
                  </p>
                  <div className="mt-5 space-y-2">
                    {SUGERENCIAS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => {
                const own = m.role === "user";
                const isLast = i === messages.length - 1;
                return (
                  <div key={i} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                        own ? `${accent} text-white` : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {m.content}
                      {/* Cursor mientras llega el stream */}
                      {!own && isLast && streaming && (
                        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-full bg-slate-400 align-middle" />
                      )}
                    </div>
                  </div>
                );
              })}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800"
                >
                  {error}
                </p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-slate-100 p-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu consulta…"
                disabled={streaming}
                className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 disabled:bg-slate-50 ${focusRing}`}
              />
              <button
                type="submit"
                disabled={streaming || input.trim().length === 0}
                aria-label="Enviar consulta"
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40 ${accent} ${accentHover}`}
              >
                <SendIcon width={18} height={18} />
              </button>
            </form>

            <p className={`px-4 pb-3 text-center text-[10px] text-slate-400`}>
              Respuestas generadas por IA:{" "}
              <span className={accentText}>verificá lo importante</span> con el profesional.
            </p>
          </div>
        </>
      )}
    </>
  );
}
