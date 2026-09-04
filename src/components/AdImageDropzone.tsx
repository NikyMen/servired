"use client";

import { useRef, useState } from "react";

export function AdImageDropzone({ name, currentUrl }: { name: string; currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [dragging, setDragging] = useState(false);

  function setFile(file: File | null) {
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setPreview(URL.createObjectURL(file));
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files?.[0] || null); }}
      className={`flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed text-center text-xs transition-colors ${dragging ? "border-cliente bg-cliente/10" : "border-slate-300 bg-white/60 hover:bg-white/80"}`}
    >
      {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="px-3 text-slate-500">Arrastrá una imagen o hacé clic para elegir</span>}
      <input ref={inputRef} type="file" name={name} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </label>
  );
}
