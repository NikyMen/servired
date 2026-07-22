"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "cliente" | "profesional";
  createdAt: string;
};

export function AdminPreinscriptions({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/admin/preinscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={add} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900">Agregar manualmente</h2>
          <p className="mt-1 text-sm text-slate-500">Sumá un contacto a la lista.</p>
        </div>
        <input name="name" required minLength={2} placeholder="Nombre y apellido"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20" />
        <input name="email" required type="email" placeholder="correo@ejemplo.com"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20" />
        <input name="phone" required type="tel" placeholder="Teléfono"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20" />
        <select name="type" defaultValue="cliente"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20">
          <option value="cliente">Busca servicios</option>
          <option value="profesional">Ofrece servicios</option>
        </select>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-cliente px-4 py-2.5 text-sm font-medium text-white hover:bg-cliente-dark disabled:opacity-60">
          {saving ? "Guardando…" : "Agregar contacto"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Contactos registrados</h2></div>
        {initialRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Todavía no hay preinscripciones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Nombre</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Fecha</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-5 py-3 text-slate-600"><div>{row.email}</div><div className="text-xs text-slate-400">{row.phone}</div></td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.type === "profesional" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{row.type}</span></td>
                    <td className="px-5 py-3 text-slate-500">{dateFormatter.format(new Date(row.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
