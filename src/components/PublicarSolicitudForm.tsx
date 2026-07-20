"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type Categoria = { slug: string; name: string; icon: string };

type Form = {
  title: string;
  categorySlug: string;
  description: string;
  zone: string;
  budget: string;
  contactName: string;
};

const empty: Form = {
  title: "",
  categorySlug: "",
  description: "",
  zone: "",
  budget: "",
  contactName: "",
};

export function PublicarSolicitudForm({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        // La solicitud necesita dueño: sin sesión, primero se entra y se vuelve acá.
        router.push("/entrar?next=/publicar-solicitud");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos publicar la solicitud.");
      }
      router.push("/solicitudes?nueva=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20";

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-900">¿Qué necesitás?</label>
        <input
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Ej: Reparar una pérdida de agua en la cocina"
          className={inputCls}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">Categoría</label>
          <select
            value={form.categorySlug}
            onChange={(e) => update("categorySlug", e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">Elegí una categoría</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">Ubicación</label>
          <input
            required
            value={form.zone}
            onChange={(e) => update("zone", e.target.value)}
            placeholder="Ej: Belgrano, CABA"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-900">Descripción</label>
        <textarea
          required
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Contales a los profesionales los detalles: qué pasa, cuándo lo necesitás, materiales, etc."
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">
            Presupuesto estimado <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="Ej: 20000"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">Tu nombre</label>
          <input
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="Ej: Julieta R."
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" variant="cliente" disabled={submitting} className="w-full disabled:opacity-60 sm:w-auto">
        {submitting ? "Publicando…" : "Publicar solicitud"}
      </Button>
    </form>
  );
}
