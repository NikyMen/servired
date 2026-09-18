"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONSEJOS_PLACA, TIPOS_PLACA, type TipoPlaca } from "@/lib/publicidad";

/** Tamaño del marco en el panel: la forma es la del tipo, el tamaño es solo para trabajar cómodo. */
const MARCO: Record<TipoPlaca, { w: number; h: number }> = {
  lateral: { w: 130, h: 260 },
  superior: { w: 320, h: 160 },
  pie: { w: 240, h: 240 },
};

/** Cómo se ve en cada pantalla: anchos reales aproximados de la placa en la portada. */
const VISTAS: Record<TipoPlaca, { etiqueta: string; ancho: number }[]> = {
  lateral: [{ etiqueta: "Compu", ancho: 112 }, { etiqueta: "Compu grande", ancho: 176 }],
  superior: [{ etiqueta: "Celular", ancho: 158 }, { etiqueta: "Tablet", ancho: 340 }],
  pie: [{ etiqueta: "Celular", ancho: 158 }, { etiqueta: "Compu", ancho: 240 }],
};

const TIPOS_OK = ["image/jpeg", "image/png", "image/webp"];
const ZOOM_MAX = 4;

type Encuadre = { zoom: number; x: number; y: number };

/**
 * Sube y encuadra la imagen de una placa. El marco tiene la proporción fija de
 * la placa: la imagen se arrastra y se acerca, pero nunca se achica por debajo
 * de "cubrir" (no quedan huecos) ni se estira. Al soltar, el recorte se exporta
 * al tamaño recomendado y queda en el input `name`, que es lo que sube el form.
 */
export function AdCropper({ name, tipo, currentUrl }: { name: string; tipo: TipoPlaca; currentUrl: string | null }) {
  const { ancho, alto } = TIPOS_PLACA[tipo];
  const marco = MARCO[tipo];
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const arrastre = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [encuadre, setEncuadre] = useState<Encuadre>({ zoom: 1, x: 0, y: 0 });
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState(false);

  // Escala para cubrir el marco con zoom 1.
  const cubrir = natural ? Math.max(marco.w / natural.w, marco.h / natural.h) : 1;
  const escala = cubrir * encuadre.zoom;
  const iw = natural ? natural.w * escala : marco.w;
  const ih = natural ? natural.h * escala : marco.h;
  const limitar = useCallback((e: Encuadre, w = iw, h = ih) => ({ ...e, x: Math.min(0, Math.max(marco.w - w, e.x)), y: Math.min(0, Math.max(marco.h - h, e.y)) }), [iw, ih, marco.w, marco.h]);

  // El recorte en píxeles de la imagen original.
  const recorte = natural ? { sx: -encuadre.x / escala, sy: -encuadre.y / escala, sw: marco.w / escala, sh: marco.h / escala } : null;
  const chica = recorte ? recorte.sw < ancho / 2 : false;

  function cargar(url: string) {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      const s = Math.max(marco.w / img.naturalWidth, marco.h / img.naturalHeight);
      // Arranca centrada.
      setEncuadre({ zoom: 1, x: (marco.w - img.naturalWidth * s) / 2, y: (marco.h - img.naturalHeight * s) / 2 });
      setSrc(url);
    };
    img.onerror = () => setError("No pudimos abrir esa imagen.");
    img.src = url;
  }

  // Dibuja el recorte: chico para la vista previa y, al soltar, grande para subir.
  const dibujar = useCallback((w: number, h: number) => {
    if (!imgRef.current || !recorte) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, recorte.sx, recorte.sy, recorte.sw, recorte.sh, 0, 0, w, h);
    return canvas;
  }, [recorte]);

  useEffect(() => {
    const canvas = dibujar(Math.round(ancho / 3), Math.round(alto / 3));
    setVistaPrevia(canvas ? canvas.toDataURL("image/jpeg", 0.8) : null);
  }, [dibujar, ancho, alto]);

  const exportar = useCallback(() => {
    const canvas = dibujar(ancho, alto);
    if (!canvas || !inputRef.current) return;
    canvas.toBlob((blob) => {
      if (!blob || !inputRef.current) return;
      try {
        const dt = new DataTransfer();
        dt.items.add(new File([blob], `placa-${tipo}.jpg`, { type: "image/jpeg" }));
        inputRef.current.files = dt.files;
      } catch {
        // Navegador sin DataTransfer: sube la original y la placa la recorta con object-cover.
      }
    }, "image/jpeg", 0.88);
  }, [dibujar, ancho, alto, tipo]);

  // Con cada encuadre nuevo, el archivo que se va a subir es ese recorte.
  useEffect(() => {
    if (!src || !cambios) return;
    const id = setTimeout(exportar, 200);
    return () => clearTimeout(id);
  }, [encuadre, src, cambios, exportar]);

  // Salir con un recorte sin guardar pide confirmación.
  useEffect(() => {
    if (!cambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    const form = inputRef.current?.form;
    const alGuardar = () => window.removeEventListener("beforeunload", avisar);
    form?.addEventListener("submit", alGuardar);
    return () => { window.removeEventListener("beforeunload", avisar); form?.removeEventListener("submit", alGuardar); };
  }, [cambios]);

  function elegir(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!TIPOS_OK.includes(file.type)) return setError("Subí una imagen JPG, PNG o WEBP.");
    setCambios(true);
    cargar(URL.createObjectURL(file));
  }

  function zoom(valor: number) {
    // Acerca o aleja manteniendo el centro del marco.
    const nueva = cubrir * valor;
    const cx = (marco.w / 2 - encuadre.x) / escala;
    const cy = (marco.h / 2 - encuadre.y) / escala;
    const e = { zoom: valor, x: marco.w / 2 - cx * nueva, y: marco.h / 2 - cy * nueva };
    setEncuadre(limitar(e, natural!.w * nueva, natural!.h * nueva));
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" name={name} accept={TIPOS_OK.join(",")} className="hidden" tabIndex={-1} aria-hidden />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="glass-btn glass-btn-ghost cursor-pointer px-3 py-1.5">
          Elegir imagen
          <input type="file" accept={TIPOS_OK.join(",")} className="sr-only" onChange={(e) => elegir(e.target.files?.[0])} />
        </label>
        {currentUrl && !src && <button type="button" onClick={() => { setCambios(true); cargar(currentUrl); }} className="font-semibold text-cliente hover:underline">Re-encuadrar la imagen actual</button>}
        {cambios && <button type="button" onClick={() => { setSrc(null); setNatural(null); setCambios(false); if (inputRef.current) inputRef.current.value = ""; }} className="font-semibold text-slate-500 hover:underline">Descartar cambios</button>}
        <span className="text-slate-500">Medida recomendada: <strong>{ancho} × {alto} px</strong></span>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-2">
          <div
            data-marco
            className="relative touch-none overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100"
            style={{ width: marco.w, height: marco.h, cursor: src ? "grab" : "default" }}
            onPointerDown={(e) => { if (!src) return; e.currentTarget.setPointerCapture(e.pointerId); arrastre.current = { px: e.clientX, py: e.clientY, x: encuadre.x, y: encuadre.y }; }}
            onPointerMove={(e) => { const a = arrastre.current; if (!a) return; setEncuadre(limitar({ ...encuadre, x: a.x + e.clientX - a.px, y: a.y + e.clientY - a.py })); }}
            onPointerUp={() => { arrastre.current = null; }}
          >
            {src ? (
              <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: iw, height: ih, left: encuadre.x, top: encuadre.y }} />
            ) : currentUrl ? (
              <img src={currentUrl} alt="" className="size-full object-cover opacity-80" />
            ) : (
              <span className="flex size-full items-center justify-center p-3 text-center text-xs text-slate-400">Subí una imagen de {ancho} × {alto}</span>
            )}
          </div>
          {src && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Acercar
              <input type="range" min={1} max={ZOOM_MAX} step={0.01} value={encuadre.zoom} onChange={(e) => zoom(Number(e.target.value))} aria-label="Acercar la imagen" className="w-32" />
            </label>
          )}
          {chica && <p className="max-w-60 text-xs text-amber-700">La imagen es chica para esta placa: se va a ver borrosa. Si podés, usá una de {ancho} × {alto} px.</p>}
        </div>

        <div className="flex flex-wrap items-end gap-3" aria-label="Vista previa">
          {VISTAS[tipo].map((vista) => (
            <figure key={vista.etiqueta} className="space-y-1">
              <div data-vista={vista.etiqueta} className="overflow-hidden rounded-xl border border-slate-200 bg-white/70" style={{ width: vista.ancho, aspectRatio: `${ancho} / ${alto}` }}>
                {(vistaPrevia ?? currentUrl) && <img src={vistaPrevia ?? currentUrl!} alt="" className="size-full object-cover" />}
              </div>
              <figcaption className="text-center text-[11px] text-slate-500">{vista.etiqueta}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-500">
        {CONSEJOS_PLACA.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}
