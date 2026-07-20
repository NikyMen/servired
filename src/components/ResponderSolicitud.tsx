"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** El profesional responde una solicitud abierta: crea la conversación y va a mensajes. */
export function ResponderSolicitud({
  requestId,
  clientName,
  requestTitle,
}: {
  requestId: string;
  clientName: string;
  requestTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(
    `Hola ${clientName}, vi tu solicitud "${requestTitle}". Puedo ayudarte, ¿coordinamos?`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/solicitudes/${requestId}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) {
        router.push("/entrar?next=/pro");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos enviar el mensaje.");
      }
      router.push("/pro/mensajes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="pro" onClick={() => setOpen(true)} className="!py-1.5 !text-xs">
        Responder
      </Button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pro focus:ring-2 focus:ring-pro/20"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button variant="pro" disabled={sending} onClick={enviar} className="!py-1.5 !text-xs">
          {sending ? "Enviando…" : "Enviar"}
        </Button>
        <Button variant="outline" disabled={sending} onClick={() => setOpen(false)} className="!py-1.5 !text-xs">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
