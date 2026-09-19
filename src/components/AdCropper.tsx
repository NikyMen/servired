"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONSEJOS_PLACA, TIPOS_PLACA, type TipoPlaca } from "@/lib/publicidad";

/** Lado del marco en el panel: la forma es la de la placa, el tamaño es solo para trabajar cómodo. */
const MARCO = 240;

/** Cómo se ve en cada pantalla: anchos reales aproximados de la placa en la portada. */
const VISTAS: Record<TipoPlaca, { etiqueta: string; ancho: number }[]> = {
  lateral: [{ etiqueta: "Compu", ancho: 112 }, { etiqueta: "Compu grande", ancho: 224 }],
  superior: [{ etiqueta: "Celular", ancho: 102 }, { etiqueta: "Tablet", ancho: 232 }],
  pie: [{ etiqueta: "Celular", ancho: 158 }, { etiqueta: "Compu", ancho: 240 }],
};

const TIPOS_OK = ["image/jpeg", "image/png", "image/webp"];
/** Relativos a "cubrir el marco": por debajo de 1 la imagen se aleja y aparece el fondo. */
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;
const HEX = /^#[0-9a-f]{6}$/i;

type Encuadre = { zoom: number; x: number; y: number };

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

/** Promedio del borde de la imagen: el color que mejor disimula el fondo al alejarla. */
function colorDelBorde(img: HTMLImageElement) {
  const lado = 64;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#ffffff";
  ctx.drawImage(img, 0, 0, lado, lado);
  const { data } = ctx.getImageData(0, 0, lado, lado);
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if (x > 1 && x < lado - 2 && y > 1 && y < lado - 2) continue;
      const i = (y * lado + x) * 4;
      // Lo transparente de un PNG se ve blanco en la placa.
      const a = data[i + 3] / 255;
      r += data[i] * a + 255 * (1 - a);
      g += data[i + 1] * a + 255 * (1 - a);
      b += data[i + 2] * a + 255 * (1 - a);
      n++;
    }
  }
  return hex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
}

/**
 * Sube y encuadra la imagen de una placa (cuadrada, 800 × 800). La imagen se
 * arrastra, se acerca y también se aleja más allá de "cubrir": lo que queda
 * libre se pinta con el color de fondo, que se puede elegir, tomar de la
 * imagen con el cuentagotas o copiar/pegar como código. Al guardar, el recorte
 * se arma a 800 × 800 y va en el input `name`, que es lo que sube el form.
 */
export function AdCropper({ name, tipo, currentUrl }: { name: string; tipo: TipoPlaca; currentUrl: string | null }) {
  const { ancho, alto } = TIPOS_PLACA[tipo];
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const arrastre = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [encuadre, setEncuadre] = useState<Encuadre>({ zoom: 1, x: 0, y: 0 });
  const [fondo, setFondo] = useState("#ffffff");
  const [fondoTexto, setFondoTexto] = useState("#ffffff");
  const [cuentagotas, setCuentagotas] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState(false);
  const [actualNoCuadrada, setActualNoCuadrada] = useState(false);

  // Escala para cubrir el marco con zoom 1.
  const cubrir = natural ? Math.max(MARCO / natural.w, MARCO / natural.h) : 1;
  const escala = cubrir * encuadre.zoom;
  const iw = natural ? natural.w * escala : MARCO;
  const ih = natural ? natural.h * escala : MARCO;

  // Más grande que el marco: no puede dejar huecos de ese lado. Más chica: no
  // puede salirse del marco. Así nunca se pierde la imagen de vista.
  const limitar = useCallback((e: Encuadre, w = iw, h = ih) => {
    const x = Math.min(Math.max(0, MARCO - w), Math.max(Math.min(0, MARCO - w), e.x));
    const y = Math.min(Math.max(0, MARCO - h), Math.max(Math.min(0, MARCO - h), e.y));
    return { ...e, x, y };
  }, [iw, ih]);

  // Cuántos px de la placa final ocupa cada px de la original: arriba de 2 se ve borrosa.
  const chica = natural ? (ancho / MARCO) * escala > 2 : false;

  function cambiarFondo(valor: string) {
    setFondoTexto(valor);
    if (HEX.test(valor)) setFondo(valor.toLowerCase());
  }

  function cargar(url: string) {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      const s = Math.max(MARCO / img.naturalWidth, MARCO / img.naturalHeight);
      // Arranca centrada y con el color del borde de fondo.
      setEncuadre({ zoom: 1, x: (MARCO - img.naturalWidth * s) / 2, y: (MARCO - img.naturalHeight * s) / 2 });
      try {
        cambiarFondo(colorDelBorde(img));
      } catch {
        // Imagen de otro origen: no se puede leer, queda el blanco.
      }
      setSrc(url);
    };
    img.onerror = () => setError("No pudimos abrir esa imagen.");
    img.src = url;
  }

  // Dibuja el recorte: chico para la vista previa y, al soltar, grande para subir.
  const dibujar = useCallback((w: number, h: number) => {
    if (!imgRef.current || !natural) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    const k = w / MARCO;
    ctx.drawImage(imgRef.current, encuadre.x * k, encuadre.y * k, iw * k, ih * k);
    return canvas;
  }, [natural, fondo, encuadre, iw, ih]);

  useEffect(() => {
    const canvas = dibujar(Math.round(ancho / 3), Math.round(alto / 3));
    setVistaPrevia(canvas ? canvas.toDataURL("image/jpeg", 0.8) : null);
  }, [dibujar, ancho, alto]);

  /** El recorte final, 800 × 800 en JPG, armado en el momento (sin esperar a toBlob). */
  function archivoDelRecorte() {
    const canvas = dibujar(ancho, alto);
    if (!canvas) return null;
    const binario = atob(canvas.toDataURL("image/jpeg", 0.88).split(",")[1]);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new File([bytes], `placa-${tipo}.jpg`, { type: "image/jpeg" });
  }
  const armar = useRef(archivoDelRecorte);
  armar.current = archivoDelRecorte;

  // El archivo se arma al guardar, no antes: antes se exportaba con una demora
  // y un "Guardar" rápido subía el formulario sin la imagen nueva. El listener
  // va en captura sobre window para correr antes que React arme el FormData
  // del server action. Además saca el aviso de "cambios sin guardar".
  useEffect(() => {
    if (!src || !cambios) return;
    const form = inputRef.current?.form;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    const alGuardar = (e: Event) => {
      if (e.target !== form || !inputRef.current) return;
      const archivo = armar.current();
      if (archivo) {
        try {
          const dt = new DataTransfer();
          dt.items.add(archivo);
          inputRef.current.files = dt.files;
        } catch {
          setError("Este navegador no deja adjuntar el recorte: probá con Chrome, Edge o Firefox actualizados.");
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }
      window.removeEventListener("beforeunload", avisar);
    };
    window.addEventListener("beforeunload", avisar);
    window.addEventListener("submit", alGuardar, true);
    return () => {
      window.removeEventListener("beforeunload", avisar);
      window.removeEventListener("submit", alGuardar, true);
    };
  }, [src, cambios]);

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
    const cx = (MARCO / 2 - encuadre.x) / escala;
    const cy = (MARCO / 2 - encuadre.y) / escala;
    const e = { zoom: valor, x: MARCO / 2 - cx * nueva, y: MARCO / 2 - cy * nueva };
    setEncuadre(limitar(e, natural!.w * nueva, natural!.h * nueva));
  }

  /** Cuentagotas: el color del punto tocado, leído de la placa ya armada. */
  function tomarColor(e: React.PointerEvent<HTMLDivElement>) {
    const canvas = dibujar(MARCO, MARCO);
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const caja = e.currentTarget.getBoundingClientRect();
    const x = Math.min(MARCO - 1, Math.max(0, Math.round(e.clientX - caja.left)));
    const y = Math.min(MARCO - 1, Math.max(0, Math.round(e.clientY - caja.top)));
    try {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      cambiarFondo(hex(r, g, b));
    } catch {
      setError("No pudimos leer el color de esa imagen.");
    }
    setCuentagotas(false);
  }

  async function copiarColor() {
    try {
      await navigator.clipboard.writeText(fondo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setError("No pudimos copiar: seleccioná el código y copialo a mano.");
    }
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
        {cambios && <button type="button" onClick={() => { setSrc(null); setNatural(null); setCambios(false); setCuentagotas(false); if (inputRef.current) inputRef.current.value = ""; }} className="font-semibold text-slate-500 hover:underline">Descartar cambios</button>}
        <span className="text-slate-500">Medida: <strong>{ancho} × {alto} px</strong> (cuadrada)</span>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {actualNoCuadrada && !src && <p className="text-xs font-semibold text-amber-700">La imagen actual no es cuadrada: en la portada se ve cortada. Tocá “Re-encuadrar la imagen actual”, alejala si hace falta y guardá.</p>}

      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-2">
          <div
            data-marco
            className="relative touch-none overflow-hidden rounded-xl border-2 border-dashed border-slate-300"
            style={{ width: MARCO, height: MARCO, background: src ? fondo : undefined, cursor: !src ? "default" : cuentagotas ? "crosshair" : "grab" }}
            onPointerDown={(e) => {
              if (!src) return;
              if (cuentagotas) return tomarColor(e);
              e.currentTarget.setPointerCapture(e.pointerId);
              arrastre.current = { px: e.clientX, py: e.clientY, x: encuadre.x, y: encuadre.y };
            }}
            onPointerMove={(e) => { const a = arrastre.current; if (!a) return; setEncuadre(limitar({ ...encuadre, x: a.x + e.clientX - a.px, y: a.y + e.clientY - a.py })); }}
            onPointerUp={() => { arrastre.current = null; }}
          >
            {src ? (
              <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: iw, height: ih, left: encuadre.x, top: encuadre.y }} />
            ) : currentUrl ? (
              <img
                src={currentUrl}
                alt=""
                className="size-full bg-slate-100 object-cover opacity-80"
                onLoad={(e) => setActualNoCuadrada(Math.abs(e.currentTarget.naturalWidth - e.currentTarget.naturalHeight) > 2)}
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-slate-100 p-3 text-center text-xs text-slate-400">Subí una imagen de {ancho} × {alto}</span>
            )}
          </div>
          {src && (
            <>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                Alejar
                <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={encuadre.zoom} onChange={(e) => zoom(Number(e.target.value))} aria-label="Acercar o alejar la imagen" className="w-32" />
                Acercar
              </label>
              <button type="button" onClick={() => zoom(Math.max(ZOOM_MIN, Math.min(MARCO / natural!.w, MARCO / natural!.h) / cubrir))} className="text-xs font-semibold text-cliente hover:underline">
                Que entre entera
              </button>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600" style={{ maxWidth: MARCO }}>
                <span className="w-full font-semibold">Color de fondo</span>
                <input type="color" value={fondo} onChange={(e) => cambiarFondo(e.target.value)} aria-label="Elegir color de fondo" className="h-8 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
                <input value={fondoTexto} onChange={(e) => cambiarFondo(e.target.value.trim())} aria-label="Código del color de fondo" spellCheck={false} maxLength={7} className="glass-field w-20 px-2 py-1.5 font-mono text-xs" />
                <button type="button" onClick={copiarColor} className="glass-btn glass-btn-ghost px-2 py-1.5" title="Copiar el código del color">
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                <button type="button" onClick={() => setCuentagotas((v) => !v)} aria-pressed={cuentagotas} className={`glass-btn px-2 py-1.5 ${cuentagotas ? "" : "glass-btn-ghost"}`} title="Tocá un punto de la imagen para usar su color de fondo">
                  {cuentagotas ? "Tocá la imagen…" : "Tomar de la imagen"}
                </button>
                <button type="button" onClick={() => imgRef.current && cambiarFondo(colorDelBorde(imgRef.current))} className="font-semibold text-cliente hover:underline">
                  Color del borde
                </button>
              </div>
            </>
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
