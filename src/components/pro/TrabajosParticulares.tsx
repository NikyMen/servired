"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, PlusIcon, TrashIcon, XIcon } from "@/components/icons";

export type TrabajoParticular = { id: string; title: string; description: string | null; address: string | null; latitude: number | null; longitude: number | null; images: { id: string; url: string; position: number }[] };
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function TrabajosParticulares({ fotos }: { fotos: TrabajoParticular[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  function choose(list: FileList | null) { const selected = Array.from(list || []); if (!selected.length) return; if (selected.length > MAX_IMAGES) return setError("Podés elegir hasta cinco imágenes por muestra."); if (selected.some((file) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > MAX_IMAGE_BYTES)) return setError("Solo se aceptan imágenes de hasta 8 MB cada una."); setFiles(selected); setError(null); }
  function reset() { setFiles([]); setTitle(""); setDescription(""); if (input.current) input.current.value = ""; }
  async function save() { if (title.trim().length < 3 || files.length < 1) return setError("Agregá un título y entre 1 y 5 fotos."); setBusy(true); setError(null); try { const urls: string[] = []; for (const file of files) { const fd = new FormData(); fd.append("file", file); const up = await fetch("/api/upload", { method: "POST", body: fd }); const data = await up.json().catch(() => ({})); if (!up.ok) throw new Error(data.error || "No pudimos subir una foto."); urls.push(data.url); } const res = await fetch("/api/pro/trabajos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, urls }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || "No pudimos guardar la muestra."); reset(); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); } finally { setBusy(false); } }
  async function remove(id: string) { if (!confirm("¿Eliminar esta muestra?")) return; setBusy(true); const res = await fetch(`/api/pro/trabajos/${id}`, { method: "DELETE" }); if (!res.ok) setError((await res.json().catch(() => ({}))).error || "No pudimos eliminarla."); else router.refresh(); setBusy(false); }
  async function edit(id: string) { const res = await fetch(`/api/pro/trabajos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle, description: editDescription }) }); if (!res.ok) setError((await res.json().catch(() => ({}))).error || "No pudimos editarla."); else { setEditing(null); router.refresh(); } }

  return <section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Muestra del profesional</h2><p className="text-sm text-slate-500">Cada muestra puede tener hasta cinco fotos y una descripción.</p></div><button type="button" onClick={() => input.current?.click()} className="glass-btn px-3 py-2 text-sm"><PlusIcon width={16} height={16} />Agregar muestra</button></div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => choose(e.target.files)} />
    {files.length > 0 && <div className="glass glass-solid space-y-3 rounded-2xl p-4"><div className="grid grid-cols-5 gap-2">{files.map((file, i) => <img key={`${file.name}-${i}`} src={URL.createObjectURL(file)} alt="" className="aspect-square w-full rounded-xl object-cover" />)}</div><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la muestra" className="glass-field w-full px-3 py-2.5 text-sm" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Descripción opcional del trabajo" className="glass-field w-full resize-none px-3 py-2.5 text-sm" /><div className="flex gap-2"><button type="button" disabled={busy} onClick={save} className="glass-btn px-4 py-2 text-sm">{busy ? "Guardando…" : "Publicar muestra"}</button><button type="button" onClick={reset} className="glass-btn glass-btn-ghost px-4 py-2 text-sm"><XIcon width={15} height={15} />Cancelar</button></div></div>}
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {fotos.length === 0 && files.length === 0 ? <button type="button" onClick={() => input.current?.click()} className="glass flex w-full flex-col items-center gap-2 rounded-2xl border-dashed p-8 text-slate-500"><ImageIcon width={24} height={24} /><span>Todavía no publicaste muestras</span></button> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fotos.map((sample) => <li key={sample.id} className="glass glass-card overflow-hidden rounded-2xl"><div className="grid grid-cols-5 gap-0.5 bg-slate-100">{sample.images.map((image, index) => <img key={image.id} src={image.url} alt={`${sample.title} ${index + 1}`} className={`h-28 w-full object-cover ${sample.images.length === 1 ? "col-span-5" : ""}`} />)}</div><div className="p-3">{editing === sample.id ? <div className="space-y-2"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="glass-field w-full px-2 py-1.5 text-sm" /><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="glass-field w-full resize-none px-2 py-1.5 text-sm" /><button type="button" onClick={() => edit(sample.id)} className="text-xs font-semibold text-pro-dark">Guardar</button></div> : <><p className="font-semibold text-slate-900">{sample.title}</p>{sample.description && <p className="mt-1 text-xs text-slate-500">{sample.description}</p>}<div className="mt-3 flex justify-between"><button type="button" onClick={() => { setEditing(sample.id); setEditTitle(sample.title); setEditDescription(sample.description || ""); }} className="text-xs font-semibold text-pro-dark">Editar</button><button type="button" onClick={() => remove(sample.id)} aria-label="Eliminar muestra" className="text-red-600"><TrashIcon width={16} height={16} /></button></div></>}</div></li>)}</ul>}
  </section>;
}
