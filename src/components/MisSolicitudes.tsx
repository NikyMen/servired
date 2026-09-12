"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { MAX_REPUBLISH, requestDaysLeft, requestIsLastDay } from "@/lib/solicitudes";

type Solicitud = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  republishCount: number;
};

/**
 * Las solicitudes propias, con lo que le queda de vida a cada una y el botón
 * para volver a publicarla. Vive arriba del listado general porque es el único
 * lugar donde quien publicó vuelve a ver lo suyo.
 */
export function MisSolicitudes({ solicitudes }: { solicitudes: Solicitud[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function republicar(id: string) {
    setBusy(id);
    setError(null);
    const response = await fetch(`/api/solicitudes/${id}/republicar`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "No pudimos volver a publicarla.");
    else router.refresh();
    setBusy(null);
  }

  if (!solicitudes.length) return null;

  return (
    <section id="mias" className="glass glass-solid space-y-3 rounded-2xl p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Mis solicitudes</h2>
        <p className="text-sm text-slate-500">Cada una queda publicada 7 días. El último día te avisamos para que la renueves.</p>
      </div>
      <ul className="divide-y divide-white/60">
        {solicitudes.map((solicitud) => {
          const vencida = solicitud.status === "vencida";
          const diasRestantes = requestDaysLeft(solicitud.expiresAt);
          const ultimoDia = !vencida && requestIsLastDay(solicitud.expiresAt);
          const sinTurnos = solicitud.republishCount >= MAX_REPUBLISH;
          return (
            <li key={solicitud.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{solicitud.title}</p>
                <p className="text-xs text-slate-500">
                  Publicada el {formatDate(solicitud.createdAt)}
                  {vencida ? " · vencida" : ultimoDia ? " · vence mañana" : ` · le quedan ${diasRestantes} días`}
                  {solicitud.republishCount > 0 && ` · republicada ${solicitud.republishCount} ${solicitud.republishCount === 1 ? "vez" : "veces"}`}
                </p>
              </div>
              {(vencida || ultimoDia) && (
                sinTurnos
                  ? <span className="text-xs text-slate-500">Publicá una nueva para que la vean recién salida.</span>
                  : <button type="button" disabled={busy === solicitud.id} onClick={() => republicar(solicitud.id)} className="glass-btn shrink-0 px-4 py-2 text-xs disabled:opacity-60">
                      {busy === solicitud.id ? "Publicando…" : "Volver a publicar"}
                    </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
