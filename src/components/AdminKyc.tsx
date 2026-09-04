"use client";

import { useMemo, useState } from "react";
import { reviewKycAction } from "@/app/admin/actions";
import { formatDate, formatDateTime } from "@/lib/format";

export type AdminKycRow = {
  id: string; status: string; legalName: string; email: string; phone: string; cuil: string; dni: string;
  birthDate: string; address: string; country: string; province: string; locality: string;
  provider: string; providerType: string; headline: string | null; bio: string | null;
  paymentAlias: string | null; paymentCvu: string | null; submittedAt: string | null;
  reviewReason: string | null; reviewedBy: string | null; reviewedAt: string | null;
  videoChallenge: string | null; documents: { id: string; kind: string }[];
};

const statusLabel: Record<string, string> = { pending: "Pendiente", approved: "Aprobado", changes_requested: "Cambios solicitados", rejected: "Rechazado", draft: "Borrador" };

export function AdminKyc({ rows }: { rows: AdminKycRow[] }) {
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("all");
  const [date, setDate] = useState("");
  const filtered = useMemo(() => rows.filter((row) => (status === "all" || row.status === status) && (type === "all" || row.providerType === type) && (!date || row.submittedAt?.slice(0, 10) === date)), [rows, status, type, date]);

  return <section className="space-y-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-pro">Control de identidad</p><h2 className="text-2xl font-bold text-slate-900">Verificaciones KYC</h2><p className="text-sm text-slate-500">{rows.filter((row) => row.status === "pending").length} pendientes de revisión.</p></div><div className="grid grid-cols-3 gap-2"><select value={status} onChange={(e) => setStatus(e.target.value)} className="glass-field px-2 py-2 text-xs"><option value="all">Todos</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={type} onChange={(e) => setType(e.target.value)} className="glass-field px-2 py-2 text-xs"><option value="all">Ambos tipos</option><option value="profesional">Profesional</option><option value="oficio">Oficio</option></select><input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="glass-field px-2 py-2 text-xs" /></div></div>
    {filtered.length === 0 ? <p className="glass rounded-2xl p-6 text-sm text-slate-500">No hay expedientes con esos filtros.</p> : <div className="space-y-3">{filtered.map((row) => <details key={row.id} className="glass glass-solid group overflow-hidden rounded-2xl"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 marker:hidden"><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-slate-900">{row.legalName}</h3><p className="truncate text-sm text-slate-500">{row.email} · {row.providerType}</p></div><span className="hidden text-xs text-slate-500 sm:block">CUIL •••{row.cuil.slice(-4)} · DNI •••{row.dni.slice(-3)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "pending" ? "bg-amber-100 text-amber-800" : row.status === "approved" ? "bg-emerald-100 text-emerald-800" : row.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{statusLabel[row.status] || row.status}</span></summary><div className="space-y-5 border-t border-white/60 p-4 sm:p-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Datum label="Acceso" value={row.provider} /><Datum label="Teléfono" value={row.phone} /><Datum label="CUIL" value={row.cuil} mono /><Datum label="DNI" value={row.dni} mono /><Datum label="Nacimiento" value={formatDate(row.birthDate)} /><Datum label="Domicilio" value={row.address} /><Datum label="Ubicación" value={`${row.locality}, ${row.province}, ${row.country}`} /><Datum label="Presentado" value={row.submittedAt ? formatDateTime(row.submittedAt) : "—"} /></dl>
          <section className="rounded-2xl bg-white/60 p-4"><h4 className="font-bold text-slate-900">Perfil a publicar</h4><p className="mt-1 text-sm"><strong>{row.headline || "—"}</strong> · {row.providerType}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{row.bio || "Sin descripción"}</p><p className="mt-3 text-xs text-slate-500">Alias: {row.paymentAlias || "—"} · CVU: <span className="font-mono">{row.paymentCvu || "—"}</span></p></section>
          <section><h4 className="mb-2 font-bold text-slate-900">Documentación privada</h4>{row.videoChallenge && <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-center font-bold tracking-wide text-pro-dark">Frase esperada: {row.videoChallenge}</p>}<div className="grid gap-3 sm:grid-cols-3">{row.documents.map((document) => document.kind === "identity_video" ? <video key={document.id} src={`/api/admin/kyc-documents/${document.id}`} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black sm:col-span-3" /> : <a key={document.id} href={`/api/admin/kyc-documents/${document.id}`} target="_blank" rel="noopener noreferrer" className="block"><img src={`/api/admin/kyc-documents/${document.id}`} alt={document.kind === "dni_front" ? "DNI frente" : "DNI dorso"} className="aspect-[1.58] w-full rounded-xl bg-slate-100 object-contain" /><span className="mt-1 block text-center text-xs font-semibold text-cliente">{document.kind === "dni_front" ? "DNI frente" : "DNI dorso"}</span></a>)}</div></section>
          {row.reviewReason && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>Última observación:</strong> {row.reviewReason}</p>}
          {row.reviewedAt && <p className="text-xs text-slate-400">Revisado por {row.reviewedBy || "administración"} el {formatDateTime(row.reviewedAt)}</p>}
          <form action={reviewKycAction} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><input type="hidden" name="id" value={row.id} /><label className="text-sm font-semibold text-slate-700">Motivo para pedir cambios o rechazar<textarea name="reason" required minLength={5} rows={2} placeholder="Obligatorio para cambios o rechazo" className="glass-field mt-1 w-full resize-none px-3 py-2 text-sm" /></label><div className="mt-3 flex flex-wrap gap-2"><button name="action" value="approve" formNoValidate className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Aprobar</button><button name="action" value="changes" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white">Pedir cambios</button><button name="action" value="reject" className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white">Rechazar</button></div></form>
        </div></details>)}</div>}
  </section>;
}

function Datum({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-xl bg-white/60 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 break-words text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
