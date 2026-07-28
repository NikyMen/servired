"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Acciones de una propuesta según el lado que la está viendo. */
export function BookingActions({
  bookingId,
  status,
  viewer,
}: {
  bookingId: string;
  status: string;
  viewer: "cliente" | "profesional";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: string, details: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contrataciones/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, ...details }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No pudimos actualizar la propuesta.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function quoteBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quotedPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresá un presupuesto válido.");
      return;
    }
    void setStatus("presupuestada", { quotedPrice: Math.round(amount) });
  }

  function completeBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(finalPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresá el monto final del trabajo.");
      return;
    }
    if (workSummary.trim().length < 8) {
      setError("Agregá una breve explicación del trabajo realizado.");
      return;
    }
    void setStatus("completada", { finalPrice: Math.round(amount), workSummary: workSummary.trim() });
  }

  if (viewer === "cliente" && status === "solicitada") {
    return (
      <Button variant="outline" disabled={busy} onClick={() => setStatus("cancelada")} className="!py-1.5 !text-xs">
        Cancelar pedido
      </Button>
    );
  }

  if (viewer === "cliente" && status === "presupuestada") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="cliente" disabled={busy} onClick={() => setStatus("aceptada")} className="!py-1.5 !text-xs">
          Aceptar propuesta
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setStatus("cancelada")} className="!py-1.5 !text-xs">
          No aceptar
        </Button>
      </div>
    );
  }

  if (viewer === "profesional" && status === "solicitada") {
    if (!quoteOpen) {
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="pro" disabled={busy} onClick={() => setQuoteOpen(true)} className="!py-1.5 !text-xs">
            Dar presupuesto
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => setStatus("cancelada")} className="!py-1.5 !text-xs">
            No puedo hacerlo
          </Button>
        </div>
      );
    }
    return (
      <form onSubmit={quoteBooking} className="w-64 space-y-2 rounded-2xl border border-emerald-200 bg-pro-bg2 p-3">
        <p className="text-xs font-semibold text-pro-dark">Tu presupuesto aproximado</p>
        <input
          type="number"
          min="1"
          step="1"
          value={quotedPrice}
          onChange={(event) => setQuotedPrice(event.target.value)}
          placeholder="Monto en ARS"
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-pro"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setQuoteOpen(false)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">
            Volver
          </button>
          <Button type="submit" variant="pro" disabled={busy} className="!px-3 !py-2 !text-xs">
            {busy ? "Enviando…" : "Enviar presupuesto"}
          </Button>
        </div>
      </form>
    );
  }

  if (viewer === "profesional" && status === "aceptada") {
    return (
      <div className="flex flex-col items-end gap-2">
        {!completeOpen ? (
          <Button variant="pro" disabled={busy} onClick={() => setCompleteOpen(true)} className="!py-1.5 !text-xs">
            Marcar completada
          </Button>
        ) : (
          <form onSubmit={completeBooking} className="w-64 space-y-2 rounded-2xl border border-emerald-200 bg-pro-bg2 p-3">
            <p className="text-xs font-semibold text-pro-dark">Cerrar trabajo</p>
            <input
              type="number"
              min="1"
              step="1"
              value={finalPrice}
              onChange={(event) => setFinalPrice(event.target.value)}
              placeholder="Monto final"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-pro"
            />
            <textarea
              rows={2}
              value={workSummary}
              onChange={(event) => setWorkSummary(event.target.value)}
              placeholder="Qué hiciste y cómo quedó"
              required
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-pro"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCompleteOpen(false)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">
                Volver
              </button>
              <Button type="submit" variant="pro" disabled={busy} className="!px-3 !py-2 !text-xs">
                {busy ? "Guardando…" : "Guardar trabajo"}
              </Button>
            </div>
          </form>
        )}
        {error && !completeOpen && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return null;
}
