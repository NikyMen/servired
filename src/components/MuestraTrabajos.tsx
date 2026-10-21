"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ImageIcon, XIcon } from "@/components/icons";
import { DenunciarImagen } from "@/components/DenunciarImagen";

type Muestra = {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  images: { id: string; url: string }[];
};

/**
 * La "Muestra" del perfil público. Antes eran todas las fotos de un trabajo en
 * columnitas de 1/5, cada una con su "Denunciar" encima: no se veía nada y no
 * se podían abrir. Ahora cada trabajo es una tarjeta con su foto de portada y
 * cuántas tiene; tocarla abre el visor con todas, de a una, y ahí está el
 * "Denunciar" de cada foto.
 */
export function MuestraTrabajos({ muestras, puedeDenunciar, volverA }: { muestras: Muestra[]; puedeDenunciar: boolean; volverA: string }) {
  const [abierta, setAbierta] = useState<{ muestra: number; foto: number } | null>(null);
  const conFotos = muestras.filter((m) => m.images.length > 0);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {conFotos.map((muestra, i) => (
          <li key={muestra.id}>
            <button
              type="button"
              onClick={() => setAbierta({ muestra: i, foto: 0 })}
              aria-label={`Ver las fotos de ${muestra.title}`}
              className="glass glass-thin group block h-full w-full overflow-hidden rounded-2xl text-left transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span className="relative block aspect-[4/3] overflow-hidden bg-slate-200">
                <img src={muestra.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {muestra.images.length > 1 && (
                  <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-slate-950/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    <ImageIcon width={12} height={12} />
                    {muestra.images.length}
                  </span>
                )}
              </span>
              <span className="block p-3">
                <span className="block truncate text-sm font-semibold text-slate-900">{muestra.title}</span>
                {muestra.description && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{muestra.description}</span>}
                {muestra.address && <span className="mt-1 block truncate text-[11px] text-slate-400">📍 {muestra.address}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {abierta && (
        <Visor
          muestra={conFotos[abierta.muestra]}
          foto={abierta.foto}
          onFoto={(foto) => setAbierta({ ...abierta, foto })}
          onCerrar={() => setAbierta(null)}
          puedeDenunciar={puedeDenunciar}
          volverA={volverA}
        />
      )}
    </>
  );
}

function Visor({ muestra, foto, onFoto, onCerrar, puedeDenunciar, volverA }: { muestra: Muestra; foto: number; onFoto: (foto: number) => void; onCerrar: () => void; puedeDenunciar: boolean; volverA: string }) {
  const total = muestra.images.length;
  const imagen = muestra.images[foto];
  const cerrar = useRef<HTMLButtonElement>(null);
  const toque = useRef<number | null>(null);
  const ir = (delta: number) => onFoto((foto + delta + total) % total);

  useEffect(() => {
    cerrar.current?.focus();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previo; };
  }, []);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      // Con el formulario de denuncia abierto, las teclas son de él.
      if (document.querySelector('[aria-label="Denunciar imagen"]')) return;
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowRight" && total > 1) onFoto((foto + 1) % total);
      else if (e.key === "ArrowLeft" && total > 1) onFoto((foto - 1 + total) % total);
    };
    document.addEventListener("keydown", teclas);
    return () => document.removeEventListener("keydown", teclas);
  }, [foto, total, onFoto, onCerrar]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${muestra.title}`} className="fixed inset-0 z-[75] flex flex-col bg-slate-950/95 text-white" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <header className="flex shrink-0 items-center gap-3 px-3 pt-[max(.75rem,env(safe-area-inset-top))] pb-2 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{muestra.title}</p>
          {total > 1 && <p className="text-xs text-white/60">Foto {foto + 1} de {total}</p>}
        </div>
        <button ref={cerrar} type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <XIcon width={22} height={22} />
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (toque.current === null || total < 2) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
        }}
      >
        <div className="relative max-h-full">
          <img key={imagen.id} src={imagen.url} alt={`${muestra.title} ${foto + 1}`} className="max-h-[calc(100dvh-13rem)] max-w-full rounded-lg object-contain" />
        </div>
        {total > 1 && (
          <>
            <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior" className="absolute left-2 grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25 sm:left-4">
              <ChevronLeftIcon width={24} height={24} />
            </button>
            <button type="button" onClick={() => ir(1)} aria-label="Foto siguiente" className="absolute right-2 grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25 sm:right-4">
              <ChevronLeftIcon width={24} height={24} className="rotate-180" />
            </button>
          </>
        )}
      </div>

      <footer className="shrink-0 space-y-2 px-3 pt-2 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-5">
        {(muestra.description || muestra.address) && (
          <div className="mx-auto max-w-2xl text-center">
            {muestra.description && <p className="line-clamp-2 text-sm text-white/80">{muestra.description}</p>}
            {muestra.address && <p className="text-xs text-white/50">📍 {muestra.address}</p>}
          </div>
        )}
        <div className="mx-auto flex max-w-2xl justify-center">
          <DenunciarImagen key={`denunciar-${imagen.id}`} targetType="work_sample_image" targetId={imagen.id} puedeDenunciar={puedeDenunciar} volverA={volverA} />
        </div>
        {total > 1 && (
          <div className="flex justify-center gap-1.5 overflow-x-auto pb-1">
            {muestra.images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => onFoto(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === foto} className={`size-12 shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === foto ? "ring-white" : "opacity-60 ring-transparent hover:opacity-100"}`}>
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>,
    document.body
  );
}
