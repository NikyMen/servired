"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { NoLeidosBadge, useNoLeidos } from "@/components/NoLeidos";
import { ChevronLeftIcon, PaperclipIcon, SendIcon, FileIcon, XIcon } from "@/components/icons";
import { formatBytes } from "@/lib/format";
import { PaymentControls } from "@/components/PaymentControls";

export type ChatMessage = {
  id: string;
  sender: string; // "cliente" | "profesional"
  text: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
};

export type ChatConversation = {
  id: string;
  withName: string; // con quién habla el que mira la pantalla
  withColor: string;
  messages: ChatMessage[];
  /** Sin leer según el servidor al renderizar. Después manda el poll del globito. */
  noLeidos: number;
};

/** Cada cuánto se buscan mensajes nuevos del hilo abierto. */
const POLL_MS = 5000;

/**
 * ¿Se ven las dos columnas a la vez?
 *
 * Importa para lo sin leer: en md el hilo está siempre a la vista, así que
 * elegirlo ya es leerlo. En móvil hay que abrirlo, y hasta entonces sigue sin
 * leer aunque sea el seleccionado.
 */
function useDosColumnas() {
  const [dos, setDos] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const aplicar = () => setDos(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);
  return dos;
}

/** Chat: lista de conversaciones + hilo. Lo usan cliente (azul) y profesional (verde). */
export function Chat({
  conversations,
  viewer,
}: {
  conversations: ChatConversation[];
  viewer: "cliente" | "profesional";
}) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? null);
  // En móvil se ve una pantalla por vez: lista o hilo (patrón app de mensajería)
  const [threadOpen, setThreadOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // El servidor da el estado inicial; el polling lo mantiene fresco sin recargar.
  const [byId, setById] = useState<Record<string, ChatMessage[]>>(() =>
    Object.fromEntries(conversations.map((c) => [c.id, c.messages]))
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const isPro = viewer === "profesional";
  const bubbleOwn = isPro ? "bg-pro text-white" : "bg-cliente text-white";
  const sendBtn = isPro ? "bg-pro hover:bg-pro-dark" : "bg-cliente hover:bg-cliente-dark";

  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null;
  const messages = selected ? (byId[selected.id] ?? selected.messages) : [];

  const { porConversacion, marcarLeida, mirandoHilo } = useNoLeidos();
  const dosColumnas = useDosColumnas();
  // El hilo cuenta como leído sólo si se está viendo de verdad.
  const hiloALaVista = (threadOpen || dosColumnas) && selected ? selected.id : null;
  // Id del primer mensaje sin leer de cada hilo: ahí va la línea de "nuevos".
  const [divisor, setDivisor] = useState<Record<string, string | null>>({});

  // Mientras se lo mira no tiene que sonar: el aviso es para lo que no estás viendo.
  useEffect(() => {
    if (!hiloALaVista) return;
    mirandoHilo(hiloALaVista);
    return () => {
      mirandoHilo(null);
      // Al salir se olvida dónde estaba la línea de nuevos: si volvés, se
      // recalcula con lo que haya llegado mientras estabas en otro hilo.
      setDivisor(({ [hiloALaVista]: _, ...resto }) => resto);
    };
  }, [hiloALaVista, mirandoHilo]);

  // Al abrirlo y cada vez que entra algo nuevo estando abierto. El provider
  // frena las repeticiones para no escribir una vez por mensaje.
  useEffect(() => {
    if (!hiloALaVista) return;
    marcarLeida(hiloALaVista);
  }, [hiloALaVista, messages.length, marcarLeida]);

  // Dónde arranca lo que no habías visto. Se fija en el momento de abrir el
  // hilo, porque un instante después queda marcado como leído y ya no habría
  // manera de saber dónde iba la línea.
  useEffect(() => {
    if (!hiloALaVista) return;
    setDivisor((prev) => {
      if (hiloALaVista in prev) return prev; // se decide una sola vez por visita
      const conv = conversations.find((c) => c.id === hiloALaVista);
      const sinLeer = porConversacion[hiloALaVista] ?? conv?.noLeidos ?? 0;
      const list = byId[hiloALaVista] ?? conv?.messages ?? [];
      // Los propios no cuentan como sin leer, así que la línea va antes del
      // más viejo de los últimos `sinLeer` que llegaron del otro lado.
      const entrantes = list.filter((m) => m.sender !== viewer);
      const primero = sinLeer > 0 ? entrantes[entrantes.length - sinLeer] : undefined;
      return { ...prev, [hiloALaVista]: primero?.id ?? null };
    });
  }, [hiloALaVista, conversations, byId, viewer, porConversacion]);

  // Hilos que aparecieron después del primer render (contrataciones nuevas).
  useEffect(() => {
    setById((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const c of conversations) {
        if (!(c.id in next)) {
          next[c.id] = c.messages;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [conversations]);

  // Polling del hilo abierto. Se corta con la pestaña en segundo plano: nadie
  // está mirando y no tiene sentido pegarle al servidor cada 5 segundos.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/conversaciones/${selectedId}/mensajes`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { messages: ChatMessage[] };
        if (!cancelled) setById((prev) => ({ ...prev, [selectedId!]: data.messages }));
      } catch {
        // Se cayó la red un segundo: el próximo tick reintenta solo.
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [selectedId]);

  // Seguir el final del hilo cuando entra algo nuevo.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedId]);

  // Liberar la URL del preview: si no, queda el blob colgado en memoria.
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function send() {
    if (!selected || sending) return;
    if (text.trim().length === 0 && !file) return;

    setSending(true);
    setError(null);

    try {
      // Primero el archivo: si falla, no se manda un mensaje sin su adjunto.
      let attachment: Record<string, unknown> = {};
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await up.json().catch(() => null);
        if (!up.ok) {
          setError(data?.error ?? "No pude subir el archivo.");
          return;
        }
        attachment = {
          attachmentUrl: data.url,
          attachmentName: data.name,
          attachmentType: data.type,
          attachmentSize: data.size,
        };
      }

      const res = await fetch(`/api/conversaciones/${selected.id}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...attachment }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No pude enviar el mensaje.");
        return;
      }

      const created = (await res.json()) as ChatMessage;
      // Se agrega ya mismo: esperar al próximo poll se siente lento.
      setById((prev) => ({
        ...prev,
        [selected.id]: [...(prev[selected.id] ?? []), { ...created, createdAt: String(created.createdAt) }],
      }));
      setText("");
      clearFile();
    } catch {
      setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="glass rounded-2xl border-dashed border-white/70 p-12 text-center">
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
    <div className="glass glass-solid grid min-h-[480px] grid-cols-1 overflow-hidden rounded-2xl md:grid-cols-[260px_1fr]">
      {/* Lista de conversaciones */}
      <aside
        className={`${threadOpen ? "hidden md:block" : ""} divide-y divide-white/60 md:border-r md:border-white/60`}
      >
        {conversations.map((c) => {
          const list = byId[c.id] ?? c.messages;
          const last = list[list.length - 1];
          const active = selected?.id === c.id;
          // Hasta el primer poll manda el número que vino del servidor.
          const sinLeer = porConversacion[c.id] ?? c.noLeidos;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                setThreadOpen(true);
                setError(null);
              }}
              className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                active ? "md:bg-[rgb(var(--accent-rgb)/0.12)]" : ""
              } ${sinLeer > 0 ? "bg-[rgb(var(--accent-rgb)/0.06)]" : ""} hover:bg-white/60`}
            >
              <span className="relative shrink-0">
                <Avatar name={c.withName} color={c.withColor} size={42} />
                {/* Punto sobre la foto: se ve quién escribió aunque la fila
                    esté cortada por el ancho de la columna. */}
                {sinLeer > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-red-500 ring-2 ring-white"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {c.withName}
                </span>
                {last && (
                  // Sin leer va más oscuro y en negrita, como cualquier bandeja.
                  <span
                    className={`block truncate text-xs ${
                      sinLeer > 0 ? "font-semibold text-slate-700" : "text-slate-500"
                    }`}
                  >
                    {last.text || (last.attachmentType?.startsWith("image/") ? "📷 Foto" : "📎 Archivo")}
                  </span>
                )}
              </span>
              {/* Acá el número son los mensajes del hilo, no los chats: ya
                  estás mirando uno solo. */}
              <NoLeidosBadge
                n={sinLeer}
                className="shrink-0"
                label={sinLeer === 1 ? "1 mensaje sin leer" : `${sinLeer} mensajes sin leer`}
              />
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
      <section className={`${threadOpen ? "flex" : "hidden md:flex"} min-w-0 flex-col`}>
        {selected && (
          <>
            <div className="flex items-center gap-2 border-b border-white/60 px-3 py-3 sm:px-4">
              <button
                onClick={() => setThreadOpen(false)}
                aria-label="Volver a conversaciones"
                className="-ml-1 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-white/70 md:hidden"
              >
                <ChevronLeftIcon width={22} height={22} />
              </button>
              <Avatar name={selected.withName} color={selected.withColor} size={34} />
              <p className="font-semibold text-slate-900">{selected.withName}</p>
            </div>

            <div className="max-h-[52vh] flex-1 space-y-3 overflow-y-auto p-4 md:max-h-none">
              {messages.map((m) => {
                const own = m.sender === viewer;
                return (
                  <Fragment key={m.id}>
                    {divisor[selected.id] === m.id && <SeparadorNuevos />}
                    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                          own ? bubbleOwn : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {m.attachmentUrl && <Attachment message={m} own={own} />}
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                        <p
                          className={`mt-0.5 text-[10px] ${own ? "text-white/70" : "text-slate-400"}`}
                        >
                          {new Date(m.createdAt).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              <div ref={bottom} />
            </div>

            <PaymentControls conversationId={selected.id} viewer={viewer} />

            {error && (
              <p
                role="alert"
                className="mx-3 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {error}
              </p>
            )}

            {/* Adjunto elegido, antes de mandarlo */}
            {file && (
              <div className="glass glass-thin animate-fade-in mx-3 mb-2 flex items-center gap-3 rounded-xl p-2">
                {preview ? (
                  <img
                    src={preview}
                    alt=""
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="glass glass-thin flex size-12 shrink-0 items-center justify-center rounded-lg text-slate-400">
                    <FileIcon width={22} height={22} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-700">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatBytes(file.size)}</span>
                </span>
                <button
                  onClick={clearFile}
                  aria-label="Quitar adjunto"
                  className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                >
                  <XIcon width={16} height={16} />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-white/60 p-3"
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  // Se corta acá también, no solo en el servidor: mejor avisar
                  // ahora que después de subir 20 MB al pedo.
                  if (f.size > 8 * 1024 * 1024) {
                    setError("El archivo no puede pesar más de 8 MB.");
                    clearFile();
                    return;
                  }
                  setError(null);
                  setFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                aria-label="Adjuntar imagen o PDF"
                title="Adjuntar imagen o PDF"
                className="shrink-0 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600"
              >
                <PaperclipIcon width={20} height={20} />
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribí un mensaje…"
                className="glass-field min-w-0 px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={sending || (text.trim().length === 0 && !file)}
                aria-label="Enviar mensaje"
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40 ${sendBtn}`}
              >
                <SendIcon width={18} height={18} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

/** La línea de "hasta acá habías leído", dentro del hilo. */
function SeparadorNuevos() {
  return (
    <div className="flex items-center gap-2 pt-1" role="separator">
      <span className="h-px flex-1 bg-red-200" aria-hidden />
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-500">
        Mensajes nuevos
      </span>
      <span className="h-px flex-1 bg-red-200" aria-hidden />
    </div>
  );
}

/** Imagen o PDF dentro de la burbuja. */
function Attachment({ message: m, own }: { message: ChatMessage; own: boolean }) {
  const isImage = m.attachmentType?.startsWith("image/");

  if (isImage) {
    return (
      <a href={m.attachmentUrl!} target="_blank" rel="noopener noreferrer" className="mb-1.5 block">
        {/* <img> y no next/image: son archivos que suben los usuarios, sin
            dimensiones conocidas y sin necesidad de optimización. */}
        <img
          src={m.attachmentUrl!}
          alt={m.attachmentName ?? "Imagen adjunta"}
          className="max-h-60 w-auto max-w-full rounded-xl object-cover"
          decoding="async"
        />
      </a>
    );
  }

  return (
    <a
      href={m.attachmentUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-1.5 flex items-center gap-2.5 rounded-xl p-2 transition-colors ${
        own ? "bg-white/15 hover:bg-white/25" : "bg-white/55 hover:bg-white/75"
      }`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          own ? "bg-white/20" : "bg-white/60 text-slate-500"
        }`}
      >
        <FileIcon width={18} height={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">
          {m.attachmentName ?? "Archivo"}
        </span>
        <span className={`text-[10px] ${own ? "text-white/70" : "text-slate-400"}`}>
          PDF{m.attachmentSize ? ` · ${formatBytes(m.attachmentSize)}` : ""}
        </span>
      </span>
    </a>
  );
}
