"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, PlusIcon, TrashIcon, XIcon } from "@/components/icons";
import { DESCRIPCION_MUESTRA_MAX, MAX_FOTOS_MUESTRA, MAX_MUESTRAS_ALTA, TITULO_MUESTRA } from "@/lib/muestras-alta";
import { guardarMuestrasRegistro, leerMuestrasRegistro, type MuestraRegistro } from "@/lib/muestras-registro";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;
const FIELD = "glass-field px-3.5 py-3 text-sm w-full";

/** Miniatura de un archivo local, liberando la URL al desmontar. */
function Miniatura({ file, className }: { file: File; className: string }) {
  // La URL nace y muere en el mismo efecto: con useMemo, el doble montaje de
  // desarrollo la liberaba y la miniatura quedaba rota.
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const creada = URL.createObjectURL(file);
    setUrl(creada);
    return () => URL.revokeObjectURL(creada);
  }, [file]);
  return url ? <img src={url} alt="" className={className} /> : <span className={`${className} block bg-slate-200`} />;
}

/**
 * Muestras opcionales al crear la cuenta de oferente. Los inputs no tienen
 * `name`: las fotos no viajan con el registro (todavía no hay sesión para
 * subirlas). Quedan en este navegador y se suben al entrar al alta.
 */
export function MuestrasRegistroField() {
  const input = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [muestras, setMuestras] = useState<MuestraRegistro[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  // Si el registro vuelve con error, el formulario se remonta: se repone lo elegido.
  useEffect(() => {
    void leerMuestrasRegistro().then((data) => {
      if (data?.muestras.length) { setMuestras(data.muestras); setAbierto(true); }
      setListo(true);
    });
  }, []);

  // Lo que se guarda es lo agregado más la muestra en curso, si ya tiene título y fotos.
  useEffect(() => {
    if (!listo) return;
    const enCurso = title.trim().length >= TITULO_MUESTRA.min && files.length ? [{ title: title.trim(), description: description.trim(), files }] : [];
    void guardarMuestrasRegistro({ email: "", muestras: [...muestras, ...enCurso].slice(0, MAX_MUESTRAS_ALTA) });
  }, [listo, muestras, files, title, description]);

  function elegir(list: FileList | null) {
    const elegidas = Array.from(list || []);
    if (input.current) input.current.value = "";
    if (!elegidas.length) return;
    if (files.length + elegidas.length > MAX_FOTOS_MUESTRA) return setError(`Cada muestra puede tener hasta ${MAX_FOTOS_MUESTRA} fotos.`);
    if (elegidas.some((file) => !TIPOS.includes(file.type) || file.size > MAX_BYTES)) return setError("Solo se aceptan imágenes JPG, PNG, WEBP o GIF de hasta 8 MB cada una.");
    setError(null); setFiles([...files, ...elegidas]);
  }

  function agregar() {
    if (title.trim().length < TITULO_MUESTRA.min) return setError("Poné un título de al menos 3 caracteres, por ejemplo «Pintura de living».");
    if (!files.length) return setError("Agregá al menos una foto.");
    setMuestras([...muestras, { title: title.trim(), description: description.trim(), files }]);
    setFiles([]); setTitle(""); setDescription(""); setError(null);
  }

  const lleno = muestras.length >= MAX_MUESTRAS_ALTA;

  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3 text-left text-sm text-slate-700 hover:bg-emerald-50">
    <ImageIcon width={22} height={22} className="shrink-0 text-emerald-700" />
    <span><strong className="block text-slate-900">Subí muestras de tus trabajos <span className="font-normal text-slate-500">(opcional)</span></strong><span className="text-xs text-slate-500">Fotos de trabajos que hiciste. Ayudan a que los clientes te elijan.</span></span>
  </button>;

  return <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
    <div className="flex items-start justify-between gap-2">
      <div><p className="text-sm font-bold text-slate-900">Muestras de tus trabajos <span className="font-normal text-slate-500">(opcional)</span></p><p className="text-xs text-slate-500">Se publican cuando aprobemos tu perfil. Podés sumar más después.</p></div>
      {!muestras.length && !files.length && <button type="button" onClick={() => setAbierto(false)} className="text-xs font-semibold text-slate-500 hover:underline">Ahora no</button>}
    </div>

    {muestras.length > 0 && <ul className="space-y-2">{muestras.map((muestra, i) => <li key={i} className="flex items-center gap-3 rounded-xl bg-white/80 p-2 ring-1 ring-slate-200">
      <Miniatura file={muestra.files[0]} className="size-12 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{muestra.title}</p><p className="text-xs text-slate-500">{muestra.files.length} foto{muestra.files.length === 1 ? "" : "s"}</p></div>
      <button type="button" onClick={() => setMuestras(muestras.filter((_, j) => j !== i))} aria-label={`Quitar la muestra ${muestra.title}`} className="grid size-10 place-items-center rounded-lg text-red-600 hover:bg-red-50"><TrashIcon width={17} height={17} /></button>
    </li>)}</ul>}

    {lleno ? <p className="text-xs text-pro-dark">Cargaste {MAX_MUESTRAS_ALTA} muestras, el máximo al registrarte.</p> : <div className="space-y-2.5">
      <input ref={input} type="file" accept={TIPOS.join(",")} multiple className="hidden" onChange={(e) => elegir(e.target.files)} />
      <div className="grid grid-cols-4 gap-2">
        {files.map((file, i) => <div key={`${file.name}-${i}`} className="relative"><Miniatura file={file} className="aspect-square w-full rounded-lg object-cover" /><button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Quitar foto" className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"><XIcon width={12} height={12} /></button></div>)}
        {files.length < MAX_FOTOS_MUESTRA && <button type="button" onClick={() => input.current?.click()} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white/70 text-[11px] text-slate-500 hover:bg-white"><ImageIcon width={18} height={18} />{files.length ? "Más" : "Fotos"}</button>}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITULO_MUESTRA.max} placeholder="Título, ej.: Pintura de living" aria-label="Título de la muestra" className={FIELD} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={DESCRIPCION_MUESTRA_MAX} rows={2} placeholder="Descripción (opcional)" aria-label="Descripción de la muestra" className={`${FIELD} resize-none`} />
      <button type="button" onClick={agregar} className="glass-btn px-3 py-2 text-sm"><PlusIcon width={15} height={15} />{muestras.length ? "Agregar otra muestra" : "Agregar muestra"}</button>
    </div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>;
}
