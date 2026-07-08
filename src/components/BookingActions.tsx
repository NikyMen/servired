"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Acciones sobre una contratación según quién mira:
 * - cliente: cancelar mientras está solicitada
 * - profesional: aceptar / rechazar, y marcar completada
 */
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

  async function setStatus(next: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/contrataciones/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (viewer === "cliente" && status === "solicitada") {
    return (
      <Button variant="outline" disabled={busy} onClick={() => setStatus("cancelada")} className="!py-1.5 !text-xs">
        Cancelar
      </Button>
    );
  }

  if (viewer === "profesional" && status === "solicitada") {
    return (
      <div className="flex gap-2">
        <Button variant="pro" disabled={busy} onClick={() => setStatus("aceptada")} className="!py-1.5 !text-xs">
          Aceptar
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setStatus("cancelada")} className="!py-1.5 !text-xs">
          Rechazar
        </Button>
      </div>
    );
  }

  if (viewer === "profesional" && status === "aceptada") {
    return (
      <Button variant="pro" disabled={busy} onClick={() => setStatus("completada")} className="!py-1.5 !text-xs">
        Marcar completada
      </Button>
    );
  }

  return null;
}
