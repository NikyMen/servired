"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, PlusIcon, TrashIcon, XIcon } from "@/components/icons";
import { DESCRIPCION_MUESTRA_MAX, MAX_FOTOS_MUESTRA, MAX_MUESTRAS_ALTA, TITULO_MUESTRA, type MuestraAlta } from "@/lib/muestras-alta";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;
const FIELD = "glass-field mt-1 w-full px-3 py-2.5 text-sm";

/**
 * Paso opcional del alta: muestras de trabajos hechos. Las fotos se suben al
 * elegirlas (así no se pierden si se corta el envío final) y la lista queda en
 * el borrador del formulario; el perfil recién se crea al enviar el alta.
 */
export function MuestrasAlta({ muestras, onChange, onEnCurso }: { muestras: MuestraAlta[]; onChange: (muestras: MuestraAlta[]) => void; onEnCurso: (enCurso: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lleno = muestras.length >= MAX_MUESTRAS_ALTA;
  // Al salir del paso (por ejemplo con «Atrás») la muestra a medio cargar se descarta.
  useEffect(() => () => onEnCurso(false), [onEnCurso]);

  function marcar(nuevas: string[], titulo = title) { onEnCurso(nuevas.length > 0 || titulo.trim().length > 0); }

  async function elegir(list: FileList | null) {
    const elegidas = Array.from(list || []);
    if (input.current) input.current.value = "";
    if (!elegidas.length) return;
    if (urls.length + elegidas.length > MAX_FOTOS_MUESTRA) return setError(`Cada muestra puede tener hasta ${MAX_FOTOS_MUESTRA} fotos.`);
    if (elegidas.some((file) => !TIPOS.includes(file.type) || file.size > MAX_BYTES)) return setError("Solo se aceptan imágenes JPG, PNG, WEBP o GIF de hasta 8 MB cada una.");
    setError(null);
    let acumuladas = urls;
    for (const file of elegidas) {
      setSubiendo((n) => n + 1);
      try {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.url !== "string") throw new Error(data.error || "No pudimos subir una foto.");
        acumuladas = [...acumuladas, data.url];
        setUrls(acumuladas); marcar(acumuladas);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos subir una foto. Probá de nuevo.");
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  }

  function quitarFoto(url: string) { const resto = urls.filter((u) => u !== url); setUrls(resto); marcar(resto); }

  function agregar() {
    if (title.trim().length < TITULO_MUESTRA.min) return setError("Poné un título de al menos 3 caracteres, por ejemplo «Pintura de living».");
    if (urls.length < 1) return setError("Agregá al menos una foto.");
    onChange([...muestras, { title: title.trim(), description: description.trim(), urls }]);
    setUrls([]); setTitle(""); setDescription(""); setError(null); onEnCurso(false);
  }

  function descartar() { setUrls([]); setTitle(""); setDescription(""); setError(null); onEnCurso(false); }

  return <div className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-slate-900">Muestras de tus trabajos <span className="text-sm font-medium text-slate-500">(opcional)</span></h2>
      <p className="mt-1 text-sm text-slate-600">Subí fotos de trabajos que hiciste. Ayudan a que los clientes te elijan. Podés saltear este paso y cargarlas después desde Mi perfil.</p>
    </div>

    {muestras.length > 0 && <ul className="grid gap-3 sm:grid-cols-2">{muestras.map((muestra, i) => <li key={`${muestra.urls[0]}-${i}`} className="flex gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
      <img src={muestra.urls[0]} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{muestra.title}</p><p className="text-xs text-slate-500">{muestra.urls.length} foto{muestra.urls.length === 1 ? "" : "s"}</p>{muestra.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{muestra.description}</p>}</div>
      <button type="button" onClick={() => onChange(muestras.filter((_, j) => j !== i))} aria-label={`Quitar la muestra ${muestra.title}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-red-600 hover:bg-red-50"><TrashIcon width={18} height={18} /></button>
    </li>)}</ul>}

    {lleno ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-pro-dark">Cargaste {MAX_MUESTRAS_ALTA} muestras, el máximo del alta. Podés sumar más desde Mi perfil cuando te aprueben.</p> : <section className="space-y-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4">
      <p className="text-sm font-semibold text-slate-800">{muestras.length ? "Agregar otra muestra" : "Nueva muestra"}</p>
      <input ref={input} type="file" accept={TIPOS.join(",")} multiple className="hidden" onChange={(e) => void elegir(e.target.files)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {urls.map((url) => <div key={url} className="relative"><img src={url} alt="" className="aspect-square w-full rounded-xl object-cover" /><button type="button" onClick={() => quitarFoto(url)} aria-label="Quitar foto" className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"><XIcon width={14} height={14} /></button></div>)}
        {Array.from({ length: subiendo }).map((_, i) => <div key={`subiendo-${i}`} className="grid aspect-square w-full animate-pulse place-items-center rounded-xl bg-slate-200 text-[11px] text-slate-500">Subiendo…</div>)}
        {urls.length + subiendo < MAX_FOTOS_MUESTRA && <button type="button" onClick={() => input.current?.click()} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white/70 text-xs text-slate-500 hover:bg-white"><ImageIcon width={22} height={22} />{urls.length ? "Más fotos" : "Elegir fotos"}</button>}
      </div>
      <p className="text-xs text-slate-500">Hasta {MAX_FOTOS_MUESTRA} fotos por muestra. Al tocar «Agregar muestra» queda guardada aunque cierres esta página.</p>
      <label className="block text-sm font-medium">Título<input value={title} onChange={(e) => { setTitle(e.target.value); marcar(urls, e.target.value); }} maxLength={TITULO_MUESTRA.max} placeholder="Ej.: Pintura de living y comedor" className={FIELD} /></label>
      <label className="block text-sm font-medium">Descripción <span className="font-normal text-slate-500">(opcional)</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={DESCRIPCION_MUESTRA_MAX} rows={2} placeholder="Qué hiciste, materiales, cuánto tardaste…" className={`${FIELD} resize-none`} /></label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={subiendo > 0} onClick={agregar} className="glass-btn px-4 py-2 text-sm disabled:opacity-60"><PlusIcon width={16} height={16} />{subiendo > 0 ? "Subiendo fotos…" : "Agregar muestra"}</button>
        {(urls.length > 0 || title) && <button type="button" onClick={descartar} className="glass-btn glass-btn-ghost px-4 py-2 text-sm">Descartar</button>}
      </div>
    </section>}

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
