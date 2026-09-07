"use client";

import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Sube y encuadra la imagen de una placa publicitaria. El recuadro de abajo se ve
 * EXACTAMENTE igual que la placa en la portada (mismo object-contain + transform),
 * así que lo que se acomoda acá es lo que se publica. Se puede alejar más allá de
 * los bordes de la imagen (scale < 1) para dejar aire alrededor.
 */
export function AdImageEditor({
  name,
  currentUrl,
  scale: initialScale,
  x: initialX,
  y: initialY,
}: {
  name: string;
  currentUrl: string | null;
  scale: number;
  x: number;
  y: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState(initialScale || 1);
  const [pos, setPos] = useState({ x: initialX || 0, y: initialY || 0 });
  const pan = useRef<{ id: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  function setFile(file: File | null) {
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setPreview(URL.createObjectURL(file));
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  function reset() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  // El wheel de React es pasivo: hay que ir por listener nativo para poder
  // frenar el scroll de la página mientras se hace zoom sobre el recuadro.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      if (!preview) return;
      e.preventDefault();
      setScale((s) => clamp(s * (1 - e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE));
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [preview]);

  function onPointerDown(e: React.PointerEvent) {
    if (!preview) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pan.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const p = pan.current;
    const box = boxRef.current;
    if (!p || p.id !== e.pointerId || !box) return;
    const rect = box.getBoundingClientRect();
    setPos({
      x: clamp(p.baseX + (e.clientX - p.startX) / rect.width, -3, 3),
      y: clamp(p.baseY + (e.clientY - p.startY) / rect.height, -3, 3),
    });
  }
  function endPan(e: React.PointerEvent) {
    if (pan.current?.id === e.pointerId) pan.current = null;
  }

  const transform = `translate(${pos.x * 100}%, ${pos.y * 100}%) scale(${scale})`;

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files?.[0] || null); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        style={{ backgroundImage: "repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)", backgroundSize: "16px 16px" }}
        className={`relative aspect-square touch-none overflow-hidden rounded-xl border-2 border-dashed text-center text-xs transition-colors ${dragging ? "border-cliente" : "border-slate-300"} ${preview ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        onClick={() => { if (!preview) inputRef.current?.click(); }}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            draggable={false}
            style={{ transform, transformOrigin: "center", willChange: "transform" }}
            className="pointer-events-none absolute inset-0 size-full object-contain"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-3 text-slate-500">
            Arrastrá una imagen o hacé clic para elegir
          </span>
        )}
      </div>

      {preview && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Alejar</span>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(clamp(parseFloat(e.target.value), MIN_SCALE, MAX_SCALE))}
            className="flex-1 accent-cliente"
          />
          <span className="text-xs text-slate-500">Acercar</span>
          <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white">
            Restablecer
          </button>
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white">
            Cambiar
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" name={name} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <input type="hidden" name="imageScale" value={scale} />
      <input type="hidden" name="imageX" value={pos.x} />
      <input type="hidden" name="imageY" value={pos.y} />
    </div>
  );
}
