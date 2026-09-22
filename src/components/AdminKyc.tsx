"use client";

import { useMemo, useState } from "react";
import { reviewKycAction } from "@/app/admin/actions";
import { formatDate, formatDateTime } from "@/lib/format";

export type AdminKycRow = {
  id: string; status: string; legalName: string; email: string; phone: string; cuil: string; dni: string;
  birthDate: string; address: string; country: string; province: string; locality: string;
  provider: string; providerType: string; headline: string | null; bio: string | null;
  submittedAt: string | null;
  reviewReason: string | null; reviewedBy: string | null; reviewedAt: string | null;
  videoChallenge: string | null; documents: { id: string; kind: string }[];
};

const statusLabel: Record<string, string> = { pending: "Pendiente", approved: "Aprobado", changes_requested: "Cambios solicitados", rejected: "Rechazado", draft: "Borrador" };

/** "4/9/2026" o "04092026" -> "04/09/2026", tecleando de a un dígito por vez. */
function formatDateInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

export function AdminKyc({ rows }: { rows: AdminKycRow[] }) {
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("all");
  const [date, setDate] = useState("");
  const isoDate = useMemo(() => {
    const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
  }, [date]);
  const filtered = useMemo(() => rows.filter((row) => (status === "all" || row.status === status) && (type === "all" || row.providerType === type) && (!isoDate || row.submittedAt?.slice(0, 10) === isoDate)), [rows, status, type, isoDate]);

  return <section className="space-y-4">
    <div className="adm-card adm-card-pad flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-sm text-slate-600"><strong className="text-slate-900">{rows.filter((row) => row.status === "pending").length} pendientes</strong> de revisión, sobre {rows.length} expedientes.</p><div className="grid grid-cols-3 gap-2 sm:w-auto"><select value={status} onChange={(e) => setStatus(e.target.value)} className="adm-field py-1.5 text-xs"><option value="all">Todos</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={type} onChange={(e) => setType(e.target.value)} className="adm-field py-1.5 text-xs"><option value="all">Ambos tipos</option><option value="profesional">Profesional</option><option value="oficio">Oficio</option></select><input value={date} onChange={(e) => setDate(formatDateInput(e.target.value))} type="text" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} className="adm-field py-1.5 text-xs" /></div></div>
    {filtered.length === 0 ? <p className="adm-card p-6 text-center text-sm text-slate-500">No hay expedientes con esos filtros.</p> : <div className="space-y-3">{filtered.map((row) => <details key={row.id} className="adm-card group overflow-hidden"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 marker:hidden"><div className="min-w-0 flex-1"><h3 className="truncate font-bold text-slate-900">{row.legalName}</h3><p className="truncate text-sm text-slate-500">{row.email} · {row.providerType}</p></div><span className="hidden text-xs text-slate-500 sm:block">CUIL •••{row.cuil.slice(-4)} · DNI •••{row.dni.slice(-3)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "pending" ? "bg-amber-100 text-amber-800" : row.status === "approved" ? "bg-emerald-100 text-emerald-800" : row.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{statusLabel[row.status] || row.status}</span></summary><div className="space-y-5 border-t border-slate-200 p-4 sm:p-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Datum label="Acceso" value={row.provider} /><Datum label="Teléfono" value={row.phone} /><Datum label="CUIL" value={row.cuil} mono /><Datum label="DNI" value={row.dni} mono /><Datum label="Nacimiento" value={formatDate(row.birthDate)} /><Datum label="Domicilio" value={row.address} /><Datum label="Ubicación" value={`${row.locality}, ${row.province}, ${row.country}`} /><Datum label="Presentado" value={row.submittedAt ? formatDateTime(row.submittedAt) : "—"} /></dl>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h4 className="font-bold text-slate-900">Perfil a publicar</h4><p className="mt-1 text-sm"><strong>{row.headline || "—"}</strong> · {row.providerType}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{row.bio || "Sin descripción"}</p><p className="mt-3 text-xs text-slate-500">El profesional vincula Mercado Pago después de la aprobación.</p></section>
          <section><h4 className="mb-2 font-bold text-slate-900">Documentación privada</h4>{row.videoChallenge && <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-center font-bold tracking-wide text-pro-dark">Frase esperada: {row.videoChallenge}</p>}<div className="grid gap-3 sm:grid-cols-3">{row.documents.map((document) => document.kind === "identity_video" ? <video key={document.id} src={`/api/admin/kyc-documents/${document.id}`} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black sm:col-span-3" /> : <a key={document.id} href={`/api/admin/kyc-documents/${document.id}`} target="_blank" rel="noopener noreferrer" className="block"><img src={`/api/admin/kyc-documents/${document.id}`} alt={document.kind === "dni_front" ? "DNI frente" : "DNI dorso"} className="aspect-[1.58] w-full rounded-xl bg-slate-100 object-contain" /><span className="mt-1 block text-center text-xs font-semibold text-indigo-600">{document.kind === "dni_front" ? "DNI frente" : "DNI dorso"}</span></a>)}</div></section>
          {row.reviewReason && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>Última observación:</strong> {row.reviewReason}</p>}
          {row.reviewedAt && <p className="text-xs text-slate-400">Revisado por {row.reviewedBy || "administración"} el {formatDateTime(row.reviewedAt)}</p>}
          <form className="rounded-xl border border-slate-200 bg-slate-50 p-4"><input type="hidden" name="id" value={row.id} /><label className="text-sm font-semibold text-slate-700">Motivo para pedir cambios o rechazar<textarea name="reason" required minLength={5} rows={2} placeholder="Obligatorio para cambios o rechazo" className="adm-field mt-1 resize-none" /></label><div className="mt-3 flex flex-wrap gap-2"><button formAction={reviewKycAction.bind(null, "approve")} formNoValidate className="adm-btn adm-btn-ok">Aprobar</button><button formAction={reviewKycAction.bind(null, "changes")} className="adm-btn bg-amber-500 hover:bg-amber-600">Pedir cambios</button><button formAction={reviewKycAction.bind(null, "reject")} className="adm-btn bg-red-600 hover:bg-red-700">Rechazar</button></div></form>
        </div></details>)}</div>}
  </section>;
}

function Datum({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 break-words text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
