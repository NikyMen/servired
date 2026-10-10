"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ZonaTrabajo } from "@/components/pro/ZonaTrabajo";
import type { Punto } from "@/lib/geo";

type Perfil = {
  name: string;
  avatarUrl: string | null;
  businessName?: string | null;
  headline?: string;
  bio?: string | null;
  address?: string | null;
  zone?: string;
  categoryId?: string;
  categoryIds?: string[];
  latitude?: number | null;
  longitude?: number | null;
  providerType?: "profesional" | "oficio";
  phone?: string | null;
  yearsExperience?: number;
};

export function PerfilForm({ perfil, categories = [], centroZona = { lat: -27.4692, lng: -58.8306 } }: { perfil: Perfil; centroZona?: Punto; categories?: { id: string; name: string; icon: string; parentId?: string | null; parent?: { name: string } | null }[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const isPro = !!perfil.headline;
  const [form, setForm] = useState({
    ...perfil,
    businessName: perfil.businessName ?? "",
    bio: perfil.bio ?? "",
    address: perfil.address ?? "Corrientes, Argentina",
    phone: perfil.phone ?? "",
    yearsExperience: perfil.yearsExperience ?? 0,
  });
  // La zona de trabajo es opcional: null = aparece en el punto de su localidad.
  const [zona, setZona] = useState<Punto | null>(perfil.latitude != null && perfil.longitude != null ? { lat: perfil.latitude, lng: perfil.longitude } : null);
  const [categoryIds, setCategoryIds] = useState<string[]>(perfil.categoryIds?.length ? perfil.categoryIds : perfil.categoryId ? [perfil.categoryId] : []);
  /* Misma preselección que en el alta, para que la actividad no se escriba de
     cuarenta formas distintas. Acá "otra" es solo texto libre: proponer un
     rubro nuevo del catálogo se hace desde la verificación. */
  const [oficio, setOficio] = useState<string>(() => {
    const elegido = categories.find((category) => category.name === perfil.headline);
    return elegido ? elegido.id : perfil.headline ? "otra" : "";
  });
  const [preview, setPreview] = useState<string | null>(perfil.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fotoEstado, setFotoEstado] = useState<{ subiendo: boolean; texto: string | null; error: boolean }>({ subiendo: false, texto: null, error: false });
  const mensajeRef = useRef<HTMLParagraphElement>(null);
  const groupedCategories = [...categories.reduce((groups, category) => {
    const name = category.parent?.name ?? "Otros servicios";
    groups.set(name, [...(groups.get(name) ?? []), category]);
    return groups;
  }, new Map<string, typeof categories>()).entries()];

  /* La foto se guarda sola apenas se elige, sin depender del resto del
     formulario: antes viajaba con todo el perfil y, si fallaba cualquier otro
     campo, la vista previa mostraba la foto nueva pero no quedaba guardada. */
  async function cambiarFoto(file: File | undefined) {
    if (!file) return;
    const anterior = preview;
    setPreview(URL.createObjectURL(file));
    setFotoEstado({ subiendo: true, texto: "Subiendo foto…", error: false });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const uploaded = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(uploaded.error ?? "No pudimos subir la foto.");
      const res = isPro
        ? await fetch("/api/pro/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: uploaded.url }) })
        : await fetch("/api/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, avatarUrl: uploaded.url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar la foto.");
      setForm((current) => ({ ...current, avatarUrl: uploaded.url }));
      setFotoEstado({ subiendo: false, texto: "Foto actualizada.", error: false });
      router.refresh();
    } catch (error) {
      setPreview(anterior);
      setFotoEstado({ subiendo: false, texto: error instanceof Error ? error.message : "No pudimos cambiar la foto.", error: true });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, latitude: zona?.lat ?? null, longitude: zona?.lng ?? null, categoryIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar el perfil.");
      setMessage("Perfil guardado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setSaving(false);
      // El aviso queda al final de un formulario largo: lo traemos a la vista.
      requestAnimationFrame(() => mensajeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  const field = "glass-field px-3 py-2.5 text-sm";
  return (
    <form onSubmit={submit} className="glass glass-solid space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <button type="button" disabled={fotoEstado.subiendo} onClick={() => fileInput.current?.click()} className="size-20 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white disabled:opacity-60">
          {preview ? <img src={preview} alt="Foto de perfil" className="size-full object-cover" /> : <span className="text-xs text-slate-500">Subir foto</span>}
        </button>
        <div><p className="font-semibold text-slate-900">Foto de perfil</p><p className="text-xs text-slate-500">JPG, PNG, WEBP o GIF. Se guarda apenas la elegís.</p>{fotoEstado.texto && <p role="status" className={`mt-1 text-xs font-semibold ${fotoEstado.error ? "text-red-600" : "text-emerald-700"}`}>{fotoEstado.texto}</p>}</div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => cambiarFoto(e.target.files?.[0])} />
      </div>

      <label className="block text-sm font-medium text-slate-900">Nombre
        <input required minLength={2} readOnly={isPro} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${field} mt-1 ${isPro ? "cursor-not-allowed opacity-70" : ""}`} />
        {isPro && <span className="mt-1 block text-xs font-normal text-slate-500">El nombre legal se modifica mediante una nueva verificación.</span>}
      </label>

      {isPro && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-900">Nombre del local o negocio
            <input value={form.businessName ?? ""} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Ej: Electricidad Gómez" className={`${field} mt-1`} />
          </label>
          <fieldset className="text-sm font-medium text-slate-900"><legend>Rubros</legend><div className="mt-1 max-h-52 space-y-3 overflow-y-auto rounded-xl bg-white/50 p-3">{groupedCategories.map(([group, items]) => <section key={group}><h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{group}</h3>{items.map((c) => <label key={c.id} className="block py-0.5 text-xs font-normal"><input type="checkbox" checked={categoryIds.includes(c.id)} onChange={(e) => setCategoryIds((current) => e.target.checked ? [...current, c.id] : current.filter((id) => id !== c.id))} className="mr-2" />{c.icon} {c.name}</label>)}</section>)}</div></fieldset>
          <label className="text-sm font-medium text-slate-900">Actividad
            <select value={oficio} onChange={(e) => { const value = e.target.value; setOficio(value); const category = categories.find((item) => item.id === value); setForm((current) => ({ ...current, headline: category ? category.name : "" })); if (category) setCategoryIds((current) => current.includes(category.id) ? current : [...current, category.id]); }} className={`${field} mt-1`}>
              <option value="">Elegí de la lista</option>
              {groupedCategories.map(([group, items]) => <optgroup key={group} label={group}>{items.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</optgroup>)}
              <option value="otra">Otra (la escribo yo)</option>
            </select>
            {oficio === "otra" && <input required maxLength={60} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Ej: Restaurador de muebles" className={`${field} mt-1`} />}
          </label>
          <label className="text-sm font-medium text-slate-900">Teléfono de contacto
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" placeholder="+54 9 379 412-3456" className={`${field} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Lo ven en tu perfil las personas con cuenta verificada.</span>
          </label>
          <label className="text-sm font-medium text-slate-900">Años en el oficio
            <input value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value.replace(/\D/g, "").slice(0, 2) || 0) })} inputMode="numeric" className={`${field} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Aparte de tu antigüedad en ServiRed, que se calcula sola.</span>
          </label>
          <label className="text-sm font-medium text-slate-900">Dirección
            <input required value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle y altura, Corrientes" className={`${field} mt-1`} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-900">Descripción de los trabajos que ofrecés
          <textarea required minLength={20} rows={4} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${field} mt-1 resize-none`} />
        </label>
        <ZonaTrabajo zona={zona} centro={centroZona} onChange={setZona} />
      </>}

      {message && <p ref={mensajeRef} role="status" className="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700">{message}</p>}
      <button disabled={saving} className="glass-btn px-5 py-2.5 text-sm disabled:opacity-60">{saving ? "Guardando…" : "Guardar perfil"}</button>
    </form>
  );
}
