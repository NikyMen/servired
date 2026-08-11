"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPicker } from "@/components/MapPicker";

type Perfil = {
  name: string;
  avatarUrl: string | null;
  businessName?: string | null;
  headline?: string;
  bio?: string | null;
  address?: string | null;
  zone?: string;
  categoryId?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function PerfilForm({ perfil, categories = [] }: { perfil: Perfil; categories?: { id: string; name: string; icon: string }[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const isPro = !!perfil.headline;
  const [form, setForm] = useState({
    ...perfil,
    businessName: perfil.businessName ?? "",
    bio: perfil.bio ?? "",
    address: perfil.address ?? "Corrientes, Argentina",
    latitude: perfil.latitude ?? -27.4692,
    longitude: perfil.longitude ?? -58.8306,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(perfil.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      let avatarUrl = form.avatarUrl;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const uploaded = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(uploaded.error ?? "No pudimos subir la foto.");
        avatarUrl = uploaded.url;
      }
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avatarUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar el perfil.");
      setMessage("Perfil guardado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setSaving(false);
    }
  }

  const field = "glass-field px-3 py-2.5 text-sm";
  return (
    <form onSubmit={submit} className="glass glass-solid space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileInput.current?.click()} className="size-20 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white">
          {preview ? <img src={preview} alt="Foto de perfil" className="size-full object-cover" /> : <span className="text-xs text-slate-500">Subir foto</span>}
        </button>
        <div><p className="font-semibold text-slate-900">Foto de perfil</p><p className="text-xs text-slate-500">JPG, PNG, WEBP o GIF.</p></div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setAvatarFile(file); setPreview(URL.createObjectURL(file)); } }} />
      </div>

      <label className="block text-sm font-medium text-slate-900">Nombre
        <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${field} mt-1`} />
      </label>

      {isPro && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-900">Nombre del local o negocio
            <input value={form.businessName ?? ""} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Ej: Electricidad Gómez" className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium text-slate-900">Rubro
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`${field} mt-1`}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-900">Actividad
            <input required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="text-sm font-medium text-slate-900">Dirección
            <input required value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle y altura, Corrientes" className={`${field} mt-1`} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-900">Descripción
          <textarea rows={4} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${field} mt-1 resize-none`} />
        </label>
        <div className="space-y-2"><div><p className="text-sm font-medium text-slate-900">Ubicación pública</p><p className="text-xs text-slate-500">Marcá el local o zona de trabajo. Esta ficha aparecerá en el mapa.</p></div>
          <MapPicker latitude={form.latitude} longitude={form.longitude} onChange={(latitude, longitude) => setForm({ ...form, latitude, longitude })} />
        </div>
      </>}

      {message && <p className="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700">{message}</p>}
      <button disabled={saving} className="glass-btn px-5 py-2.5 text-sm disabled:opacity-60">{saving ? "Guardando…" : "Guardar perfil"}</button>
    </form>
  );
}

