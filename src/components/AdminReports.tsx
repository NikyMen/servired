"use client";

import { useState } from "react";
import { resolveReportAction } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

type Report = {
  id: string;
  targetType: string;
  imageUrl: string;
  reason: string;
  detail: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { name: string; email: string };
  accused: { id: string; name: string; email: string; accountStatus: string };
};

const MOTIVOS: Record<string, string> = {
  no_es_suyo: "No es un trabajo suyo",
  inapropiado: "Contenido inapropiado",
  enganoso: "Engañoso",
  otro: "Otro motivo",
};

export function AdminReports({ rows }: { rows: Report[] }) {
  const [verResueltas, setVerResueltas] = useState(false);
  const pendientes = rows.filter((row) => row.status === "pending");
  const visibles = verResueltas ? rows : pendientes;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-cliente">Moderación</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Denuncias</h2>
          <p className="mt-1 text-sm text-slate-500">{pendientes.length} sin resolver de {rows.length} en total.</p>
        </div>
        <label className="text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={verResueltas} onChange={(event) => setVerResueltas(event.target.checked)} className="mr-1.5" />
          Ver también las resueltas
        </label>
      </div>

      {visibles.length === 0 ? (
        <p className="glass glass-solid rounded-2xl p-6 text-center text-sm text-slate-500">No hay denuncias {verResueltas ? "" : "pendientes"}.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map((row) => (
            <article key={row.id} className="glass glass-solid space-y-3 rounded-2xl p-4">
              <div className="flex gap-3">
                {/* La URL quedó congelada en la denuncia: si la imagen ya se
                    borró, el recuadro queda vacío y eso también informa. */}
                <img src={row.imageUrl} alt="Imagen denunciada" className="size-24 shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200" />
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-bold text-slate-900">{MOTIVOS[row.reason] ?? row.reason}</p>
                  {row.detail && <p className="whitespace-pre-wrap text-slate-600">{row.detail}</p>}
                  <p className="text-xs text-slate-500">Denunció {row.reporter.name} · {formatDateTime(row.createdAt)}</p>
                  <p className="text-xs text-slate-500">
                    Publicó <strong className="text-slate-700">{row.accused.name}</strong> ({row.accused.email})
                    {row.accused.accountStatus === "suspended" && <span className="ml-1 font-semibold text-red-600">· cuenta suspendida</span>}
                  </p>
                </div>
              </div>

              {row.status === "pending" ? (
                <form className="space-y-2">
                  <input type="hidden" name="id" value={row.id} />
                  <textarea name="resolution" rows={2} placeholder="Nota interna de la decisión (opcional)" className="glass-field w-full resize-none px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <button formAction={resolveReportAction.bind(null, "dismiss")} className="glass-btn glass-btn-ghost px-3 py-2 text-xs">Dejarla publicada</button>
                    <button formAction={resolveReportAction.bind(null, "remove")} className="glass-btn px-3 py-2 text-xs">Bajar la imagen</button>
                    <button formAction={resolveReportAction.bind(null, "ban")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">Bajar y suspender la cuenta</button>
                  </div>
                </form>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {row.status === "dismissed" ? "Quedó publicada" : "Se bajó la imagen"}
                  {row.resolvedAt && ` · ${formatDateTime(row.resolvedAt)}`}
                  {row.resolution && ` · ${row.resolution}`}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
