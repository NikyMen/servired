"use client";

import { useRef, useState } from "react";
import { ImageIcon, XIcon } from "@/components/icons";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Foto opcional del trabajo recibido, al calificar. Se sube al elegirla y la
 * calificación manda solo la URL; en el perfil del oferente aparece junto al
 * trabajo y al comentario.
 */
export function FotoOpinion({ url, onChange, onSubiendo }: { url: string | null; onChange: (url: string | null) => void; onSubiendo?: (subiendo: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!TIPOS.includes(file.type) || file.size > MAX_BYTES) return setError("Elegí una foto JPG, PNG o WEBP de hasta 8 MB.");
    setError(null); setSubiendo(true); onSubiendo?.(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") throw new Error(data.error || "No pudimos subir la foto.");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir la foto. Probá de nuevo.");
    } finally {
      setSubiendo(false); onSubiendo?.(false);
    }
  }

  return <div className="mt-3">
    <input ref={input} type="file" accept={TIPOS.join(",")} className="hidden" onChange={(e) => void elegir(e.target.files?.[0])} />
    {url ? <div className="relative inline-block">
      <img src={url} alt="Foto del trabajo" className="h-28 w-40 rounded-xl object-cover ring-1 ring-slate-200" />
      <button type="button" onClick={() => onChange(null)} aria-label="Quitar la foto" className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"><XIcon width={14} height={14} /></button>
    </div> : <button type="button" disabled={subiendo} onClick={() => input.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-60">
      <ImageIcon width={18} height={18} />{subiendo ? "Subiendo foto…" : "Agregar una foto del trabajo (opcional)"}
    </button>}
    {error && <p role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>}
  </div>;
}
