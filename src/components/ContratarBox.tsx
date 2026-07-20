"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { formatARS } from "@/lib/format";

type ServiceOption = { id: string; title: string; priceFrom: number };

export function ContratarBox({
  professionalId,
  services,
  frame = true,
}: {
  professionalId: string;
  services: ServiceOption[];
  /** false: sin tarjeta ni título, para usar dentro del bottom sheet móvil. */
  frame?: boolean;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState<"contratar" | "consultar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Sin sesión no se puede contratar: se manda a entrar y se vuelve al perfil. */
  function pedirLogin() {
    router.push(`/entrar?next=${encodeURIComponent(`/profesionales/${professionalId}`)}`);
  }

  async function contratar() {
    setError(null);
    setSending("contratar");
    try {
      const res = await fetch("/api/contrataciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId, serviceId: serviceId || null, note: text }),
      });
      if (res.status === 401) {
        pedirLogin();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos crear la contratación.");
      }
      router.push("/contrataciones?nueva=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setSending(null);
    }
  }

  async function consultar() {
    setError(null);
    if (text.trim().length < 2) {
      setError("Escribí tu consulta antes de enviar el mensaje.");
      return;
    }
    setSending("consultar");
    try {
      const res = await fetch("/api/conversaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId, text }),
      });
      if (res.status === 401) {
        pedirLogin();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos enviar el mensaje.");
      }
      router.push("/mensajes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setSending(null);
    }
  }

  return (
    <div className={`space-y-3 ${frame ? "rounded-2xl border border-slate-200 bg-white p-5" : ""}`}>
      {frame && <h2 className="font-bold text-slate-900">Contratar</h2>}

      {services.length > 0 && (
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cliente"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — desde {formatARS(s.priceFrom)}
            </option>
          ))}
        </select>
      )}

      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contale qué necesitás, cuándo y dónde (opcional para contratar)."
        className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20"
      />

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button
          variant="cliente"
          onClick={contratar}
          disabled={sending != null}
          className="w-full disabled:opacity-60"
        >
          {sending === "contratar" ? "Enviando…" : "Contratar"}
        </Button>
        <Button
          variant="outline"
          onClick={consultar}
          disabled={sending != null}
          className="w-full disabled:opacity-60"
        >
          {sending === "consultar" ? "Enviando…" : "Solo consultar"}
        </Button>
      </div>

      <p className="text-xs text-slate-400">
        El profesional recibe tu pedido y te responde por mensajes.
      </p>
    </div>
  );
}
