"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/icons";

export type ChatMessage = {
  id: string;
  sender: string; // "cliente" | "profesional"
  text: string;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  withName: string; // con quién habla el que mira la pantalla
  withColor: string;
  messages: ChatMessage[];
};

/** Chat simple: lista de conversaciones + hilo. Lo usan cliente (azul) y profesional (verde). */
export function Chat({
  conversations,
  viewer,
}: {
  conversations: ChatConversation[];
  viewer: "cliente" | "profesional";
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? null);
  // En móvil se ve una pantalla por vez: lista o hilo (patrón app de mensajería)
  const [threadOpen, setThreadOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const isPro = viewer === "profesional";
  const bubbleOwn = isPro ? "bg-pro text-white" : "bg-cliente text-white";
  const focusRing = isPro ? "focus:border-pro focus:ring-pro/20" : "focus:border-cliente focus:ring-cliente/20";
  const sendBtn = isPro ? "bg-pro hover:bg-pro-dark" : "bg-cliente hover:bg-cliente-dark";

  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null;

  async function send() {
    if (!selected || text.trim().length === 0 || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversaciones/${selected.id}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: viewer, text }),
      });
      if (res.ok) {
        setText("");
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-semibold text-slate-900">Sin mensajes todavía</p>
        <p className="mt-1 text-slate-500">
          {isPro
            ? "Cuando un cliente te contrate o te consulte, la conversación aparece acá."
            : "Escribile a un profesional desde su perfil y la conversación aparece acá."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[260px_1fr]">
      {/* Lista de conversaciones */}
      <aside
        className={`${threadOpen ? "hidden md:block" : ""} divide-y divide-slate-100 md:border-r md:border-slate-200`}
      >
        {conversations.map((c) => {
          const last = c.messages[c.messages.length - 1];
          const active = selected?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                setThreadOpen(true);
              }}
              className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                active ? (isPro ? "md:bg-pro-soft" : "md:bg-cliente-soft") : ""
              } hover:bg-slate-50`}
            >
              <Avatar name={c.withName} color={c.withColor} size={42} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {c.withName}
                </span>
                {last && (
                  <span className="block truncate text-xs text-slate-500">{last.text}</span>
                )}
              </span>
              <ChevronLeftIcon
                width={16}
                height={16}
                className="shrink-0 rotate-180 text-slate-300 md:hidden"
              />
            </button>
          );
        })}
      </aside>

      {/* Hilo */}
      <section className={`${threadOpen ? "flex" : "hidden md:flex"} flex-col`}>
        {selected && (
          <>
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
              <button
                onClick={() => setThreadOpen(false)}
                aria-label="Volver a conversaciones"
                className="-ml-1 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
              >
                <ChevronLeftIcon width={22} height={22} />
              </button>
              <Avatar name={selected.withName} color={selected.withColor} size={34} />
              <p className="font-semibold text-slate-900">{selected.withName}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {selected.messages.map((m) => {
                const own = m.sender === viewer;
                return (
                  <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        own ? bubbleOwn : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <p className={`mt-0.5 text-[10px] ${own ? "text-white/70" : "text-slate-400"}`}>
                        {new Date(m.createdAt).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2 border-t border-slate-100 p-3"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribí un mensaje…"
                className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 ${focusRing}`}
              />
              <button
                type="submit"
                disabled={sending || text.trim().length === 0}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${sendBtn}`}
              >
                Enviar
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
