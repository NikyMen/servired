"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { analizarDocumento, recorteDocumento } from "@/lib/document-capture";

export function DocumentCamera({ label, onCapture, onClose }: { label: string; onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mensaje, setMensaje] = useState("Abriendo cámara…");
  const [progreso, setProgreso] = useState(0);
  const [aspecto, setAspecto] = useState(16 / 9);
  const callbacks = useRef({ onCapture, onClose });
  callbacks.current = { onCapture, onClose };

  useEffect(() => {
    let activo = true, timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let anterior: Uint8Array | undefined, buenas = 0, capturando = false;
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 202;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const parar = () => { stream?.getTracks().forEach((track) => track.stop()); clearInterval(timer); };
    const ocultar = () => { if (document.hidden) callbacks.current.onClose(); };
    document.addEventListener("visibilitychange", ocultar);
    async function iniciar() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error();
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
        if (!activo) return parar();
        const video = videoRef.current;
        if (!video || !ctx) return parar();
        video.srcObject = stream;
        await video.play();
        if (!activo) return parar();
        setMensaje("Ubicá el DNI completo dentro del marco, sobre un fondo liso.");
        timer = setInterval(() => {
          if (!activo || capturando || video.readyState < 2 || !video.videoWidth) return;
          setAspecto(video.videoWidth / video.videoHeight);
          const crop = recorteDocumento(video.videoWidth, video.videoHeight);
          ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
          const resultado = analizarDocumento(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, anterior);
          anterior = resultado.gris;
          buenas = resultado.mensaje ? 0 : buenas + 1;
          setProgreso(buenas);
          setMensaje(resultado.mensaje ?? "¡Bien! Quedate quieto, tomando foto…");
          if (buenas < 6) return;
          if (crop.width < 800) { buenas = 0; setMensaje("La cámara tiene poca resolución. Probá otra cámara o usá Galería."); return; }
          capturando = true;
          const foto = document.createElement("canvas");
          foto.width = Math.round(crop.width); foto.height = Math.round(crop.height);
          foto.getContext("2d")?.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, foto.width, foto.height);
          foto.toBlob((blob) => {
            if (!activo) return;
            if (!blob) { capturando = false; buenas = 0; setMensaje("No pudimos tomar la foto. Intentá de nuevo."); return; }
            parar();
            callbacks.current.onCapture(new File([blob], `${label.replace(/\s+/g, "-")}.jpg`, { type: "image/jpeg" }));
            callbacks.current.onClose();
          }, "image/jpeg", 0.95);
        }, 250);
      } catch {
        parar();
        if (activo) setMensaje("No pudimos abrir la cámara. Permití su uso en el navegador o cerrá y elegí Galería.");
      }
    }
    void iniciar();
    return () => { activo = false; parar(); document.removeEventListener("visibilitychange", ocultar); };
  }, [label]);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") callbacks.current.onClose(); };
    const previo = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", escape); previo?.focus(); };
  }, []);

  const marco = recorteDocumento(aspecto, 1);
  return createPortal(<div role="dialog" aria-modal="true" aria-label={`Escanear ${label}`} className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-slate-950 p-4 text-white">
    <h2 className="text-lg font-bold">{label}</h2>
    <p className="max-w-lg text-center text-sm">Alineá los cuatro bordes del DNI con el marco. La foto se toma automáticamente; después revisá que los datos se lean.</p>
    <div className="relative shrink-0 overflow-hidden" style={{ aspectRatio: aspecto, width: `min(100%, 42rem, ${55 * aspecto}dvh)` }}>
      <video ref={videoRef} autoPlay muted playsInline className="size-full object-contain" />
      <div className={`pointer-events-none absolute rounded-xl border-4 ${progreso ? "border-emerald-400" : "border-white"} shadow-[0_0_0_999px_rgb(0_0_0_/_0.5)]`} style={{ left: `${marco.x / aspecto * 100}%`, top: `${marco.y * 100}%`, width: `${marco.width / aspecto * 100}%`, height: `${marco.height * 100}%` }} />
    </div>
    <p role="status" className="max-w-lg text-center text-sm">{mensaje}</p>
    <progress aria-label="Estabilidad de la foto" max={6} value={progreso} className="h-2 w-48 accent-emerald-400" />
    <button autoFocus type="button" onClick={onClose} className="rounded-xl border border-white/50 px-6 py-3 font-semibold">Cerrar cámara</button>
  </div>, document.body);
}
