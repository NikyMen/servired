"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";

type Row = { id: string; name: string; email: string; phone: string; occupation: string | null; type: "cliente" | "profesional"; createdAt: string };

export function AdminPreinscriptions({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const response = await fetch("/api/admin/preinscripciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "No se pudo guardar.");
    else { event.currentTarget.reset(); router.refresh(); }
    setSaving(false);
  }

  return <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
    <form onSubmit={add} className="adm-card h-fit space-y-3 p-4">
      <div><h2 className="font-bold text-slate-900">Agregar manualmente</h2><p className="mt-1 text-sm text-slate-500">Sumá un contacto a la lista.</p></div>
      <input name="name" required minLength={2} placeholder="Nombre y apellido" className="adm-field" />
      <input name="email" required type="email" placeholder="correo@ejemplo.com" className="adm-field" />
      <input name="phone" required type="tel" placeholder="Teléfono" className="adm-field" />
      <input name="occupation" placeholder="Oficio / profesión (opcional)" className="adm-field" />
      <select name="type" defaultValue="cliente" className="adm-field"><option value="cliente">Busca servicios</option><option value="profesional">Ofrece servicios</option></select>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button disabled={saving} className="adm-btn w-full">{saving ? "Guardando…" : "Agregar contacto"}</button>
    </form>
    <section className="adm-card overflow-hidden">
      <div className="adm-card-head"><h2 className="font-bold text-slate-900">Contactos registrados</h2><span className="adm-badge">{initialRows.length} únicos</span></div>
      {initialRows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Todavía no hay preinscripciones.</p> : <div className="overflow-x-auto"><table className="adm-table min-w-[760px]"><thead><tr><th>Nombre</th><th>Contacto</th><th>Oficio / profesión</th><th>Tipo</th><th>Fecha</th></tr></thead><tbody>{initialRows.map((row) => <tr key={row.id}><td className="font-semibold text-slate-900">{row.name}</td><td><div>{row.email}</div><div className="text-xs text-slate-400">{row.phone}</div></td><td>{row.occupation || <span className="text-slate-400">—</span>}</td><td><span className={`adm-badge ${row.type === "profesional" ? "adm-badge-ok" : "adm-badge-info"}`}>{row.type}</span></td><td className="text-slate-500">{formatDateTime(row.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
