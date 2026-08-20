"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { MapPicker } from "@/components/MapPicker";

type Categoria = { id: string; slug: string; name: string; icon: string; parentId: string | null; parent: { name: string } | null };

type Form = {
  title: string;
  categorySlug: string;
  description: string;
  zone: string;
  latitude: number;
  longitude: number;
};

const empty: Form = {
  title: "",
  categorySlug: "",
  description: "",
  zone: "Corrientes",
  latitude: -27.4692,
  longitude: -58.8306,
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
    "glass-field px-3 py-2.5 text-sm";
  const principales = categorias.filter((categoria) => !categoria.parentId);
  const selectedCategory = categorias.find((categoria) => categoria.slug === form.categorySlug);
  const selectedPrincipal = selectedCategory?.parentId ? categorias.find((categoria) => categoria.id === selectedCategory.parentId)?.slug ?? "" : selectedCategory?.slug ?? "";
  const selectedPrincipalId = categorias.find((categoria) => categoria.slug === selectedPrincipal)?.id;
  const selectedChildren = selectedPrincipalId ? categorias.filter((categoria) => categoria.parentId === selectedPrincipalId) : [];

  return (
    <form onSubmit={onSubmit} className="glass glass-solid space-y-5 rounded-2xl p-6">
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
          <label className="mb-1 block text-sm font-medium text-slate-900">Rubro y detalle</label>
          <select
            required
            value={selectedPrincipal}
            onChange={(e) => update("categorySlug", e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">Elegí un rubro</option>
            {principales.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          {selectedChildren.length > 0 && <select required value={form.categorySlug !== selectedPrincipal ? form.categorySlug : ""} onChange={(e) => update("categorySlug", e.target.value)} className={`${inputCls} mt-2 cursor-pointer`}><option value="">Elegí una subcategoría</option>{selectedChildren.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
          <p className="mt-1 text-xs text-slate-400">Esto ayuda a mostrar tu aviso a los profesionales correctos.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-900">Ubicación</label>
          <input readOnly value={form.zone} className={`${inputCls} cursor-not-allowed bg-slate-100/70`} />
          <p className="mt-1 text-xs text-slate-400">La plataforma opera por defecto en Corrientes.</p>
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

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-slate-900">Punto del trabajo</p>
          <p className="text-xs text-slate-500">Tocá el mapa para marcar la ubicación exacta.</p>
        </div>
        <MapPicker latitude={form.latitude} longitude={form.longitude} onChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))} />
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
