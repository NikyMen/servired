"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { id: string; name: string; email: string; phone: string; occupation: string | null; type: "cliente" | "profesional"; createdAt: string };

export function AdminPreinscriptions({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const response = await fetch("/api/admin/preinscripciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "No se pudo guardar.");
    else { event.currentTarget.reset(); router.refresh(); }
    setSaving(false);
  }

  return <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
    <form onSubmit={add} className="glass glass-solid h-fit space-y-4 rounded-2xl p-5">
      <div><h2 className="font-bold text-slate-900">Agregar manualmente</h2><p className="mt-1 text-sm text-slate-500">Sumá un contacto a la lista.</p></div>
      <input name="name" required minLength={2} placeholder="Nombre y apellido" className="glass-field px-3 py-2.5 text-sm" />
      <input name="email" required type="email" placeholder="correo@ejemplo.com" className="glass-field px-3 py-2.5 text-sm" />
      <input name="phone" required type="tel" placeholder="Teléfono" className="glass-field px-3 py-2.5 text-sm" />
      <input name="occupation" placeholder="Oficio / profesión (opcional)" className="glass-field px-3 py-2.5 text-sm" />
      <select name="type" defaultValue="cliente" className="glass-field px-3 py-2.5 text-sm"><option value="cliente">Busca servicios</option><option value="profesional">Ofrece servicios</option></select>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button disabled={saving} className="w-full rounded-xl bg-cliente px-4 py-2.5 text-sm font-medium text-white hover:bg-cliente-dark disabled:opacity-60">{saving ? "Guardando…" : "Agregar contacto"}</button>
    </form>
    <section className="glass glass-solid overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/60 px-5 py-4"><div><h2 className="font-bold text-slate-900">Contactos registrados</h2><p className="mt-1 text-xs text-slate-500">{initialRows.length} contactos únicos</p></div></div>
      {initialRows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Todavía no hay preinscripciones.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/45 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Nombre</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Oficio / profesión</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Fecha</th></tr></thead><tbody className="divide-y divide-white/60">{initialRows.map((row) => <tr key={row.id}><td className="px-5 py-3 font-medium text-slate-900">{row.name}</td><td className="px-5 py-3 text-slate-600"><div>{row.email}</div><div className="text-xs text-slate-400">{row.phone}</div></td><td className="px-5 py-3 text-slate-600">{row.occupation || <span className="text-slate-400">—</span>}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.type === "profesional" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{row.type}</span></td><td className="px-5 py-3 text-slate-500">{dateFormatter.format(new Date(row.createdAt))}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
