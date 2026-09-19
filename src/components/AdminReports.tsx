"use client";

import { useState } from "react";
import { resolveReportAction } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

type Report = {
  id: string;
  targetType: string;
  imageUrl: string | null;
  context: string | null;
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
  acoso: "Acoso, insultos o amenazas",
  estafa: "Intento de estafa",
  spam: "Spam o publicidad",
};

export function AdminReports({ rows }: { rows: Report[] }) {
  const [verResueltas, setVerResueltas] = useState(false);
  const pendientes = rows.filter((row) => row.status === "pending");
  const visibles = verResueltas ? rows : pendientes;

  return (
    <section className="space-y-3">
      <div className="adm-card adm-card-pad flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{pendientes.length} sin resolver</strong> de {rows.length} en total.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={verResueltas} onChange={(event) => setVerResueltas(event.target.checked)} className="size-4 accent-indigo-600" />
          Ver también las resueltas
        </label>
      </div>

      {visibles.length === 0 ? (
        <p className="adm-card p-6 text-center text-sm text-slate-500">No hay denuncias {verResueltas ? "" : "pendientes"}.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map((row) => (
            <article key={row.id} className="adm-card space-y-3 p-4">
              <div className="flex gap-3">
                {/* La URL quedó congelada en la denuncia: si la imagen ya se
                    borró, el recuadro queda vacío y eso también informa. */}
                {row.imageUrl ? (
                  <img src={row.imageUrl} alt="Imagen denunciada" className="size-24 shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200" />
                ) : (
                  <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl ring-1 ring-slate-200">💬</span>
                )}
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-bold text-slate-900">{row.targetType === "conversation" ? "Chat · " : ""}{MOTIVOS[row.reason] ?? row.reason}</p>
                  {row.detail && <p className="whitespace-pre-wrap text-slate-600">{row.detail}</p>}
                  <p className="text-xs text-slate-500">Denunció {row.reporter.name} · {formatDateTime(row.createdAt)}</p>
                  <p className="text-xs text-slate-500">
                    {row.targetType === "conversation" ? "Denunciado:" : "Publicó"} <strong className="text-slate-700">{row.accused.name}</strong> ({row.accused.email})
                    {row.accused.accountStatus === "suspended" && <span className="ml-1 font-semibold text-red-600">· cuenta suspendida</span>}
                  </p>
                </div>
              </div>

              {row.context && <ExtractoChat context={row.context} />}

              {row.status === "pending" ? (
                <form className="space-y-2">
                  <input type="hidden" name="id" value={row.id} />
                  <textarea name="resolution" rows={2} placeholder="Nota interna de la decisión (opcional)" className="adm-field w-full resize-none px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <button formAction={resolveReportAction.bind(null, "dismiss")} className="adm-btn adm-btn-ghost adm-btn-sm">{row.targetType === "conversation" ? "Descartar" : "Dejarla publicada"}</button>
                    {row.targetType !== "conversation" && <button formAction={resolveReportAction.bind(null, "remove")} className="adm-btn adm-btn-sm">Bajar la imagen</button>}
                    <button formAction={resolveReportAction.bind(null, "ban")} className="adm-btn adm-btn-sm bg-red-600 hover:bg-red-700">{row.targetType === "conversation" ? "Suspender la cuenta" : "Bajar y suspender la cuenta"}</button>
                  </div>
                </form>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {row.status === "dismissed" ? (row.targetType === "conversation" ? "Descartada" : "Quedó publicada") : row.targetType === "conversation" ? "Cuenta suspendida" : "Se bajó la imagen"}
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

type MensajeCongelado = { sender: string; text: string; attachmentUrl: string | null; createdAt: string };

/** Los mensajes que se congelaron al denunciar un chat. */
function ExtractoChat({ context }: { context: string }) {
  let mensajes: MensajeCongelado[] = [];
  try {
    mensajes = JSON.parse(context);
  } catch {
    return null;
  }
  return (
    <details className="rounded-xl bg-slate-50 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-semibold text-slate-600">Ver los últimos {mensajes.length} mensajes</summary>
      <ol className="max-h-72 space-y-1.5 overflow-y-auto px-3 pb-3">
        {mensajes.map((m, i) => (
          <li key={i} className={m.sender === "cliente" ? "text-slate-700" : m.sender === "profesional" ? "text-emerald-800" : "text-slate-400"}>
            <span className="font-semibold capitalize">{m.sender}</span>
            <span className="text-slate-400"> · {formatDateTime(m.createdAt)}</span>
            <p className="whitespace-pre-wrap break-words">{m.text || (m.attachmentUrl ? "📎 Adjunto" : "")}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
