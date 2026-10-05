"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircleIcon, FacebookIcon, LinkIcon, ShareIcon, WhatsAppIcon, XIcon } from "@/components/icons";

/**
 * Botón para compartir un perfil.
 *
 * En el celular abre el menú del sistema (navigator.share), que es el que la
 * gente ya conoce. Donde no existe —casi todo el escritorio— abre una hoja con
 * el enlace, WhatsApp y Facebook: así el botón nunca queda sin hacer nada.
 */
export function CompartirPerfil({
  ruta,
  titulo,
  texto,
  className = "",
}: {
  ruta: string;
  titulo: string;
  texto?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  async function compartir() {
    // El origen lo pone el navegador: anda igual en dev y en el VPS sin que el
    // servidor tenga que pasarle la URL del sitio.
    const url = new URL(ruta, window.location.origin).toString();
    setEnlace(url);
    setCopiado(false);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto ?? titulo, url });
        return;
      } catch (error) {
        // Si lo cerró a propósito no insistimos; cualquier otra falla cae en la hoja.
        if ((error as Error)?.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      // Sin permiso del portapapeles queda seleccionado para copiarlo a mano.
      campo.current?.select();
    }
  }

  return <>
    <button
      type="button"
      onClick={compartir}
      title="Compartir este perfil"
      className={`glass-chip px-3 py-1.5 text-sm font-semibold text-slate-600 ${className}`}
    >
      <ShareIcon width={16} height={16} className="text-slate-400" />
      Compartir
    </button>

    {open && typeof document !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
      >
        <section role="dialog" aria-modal="true" aria-label="Compartir perfil" className="glass glass-solid animate-sheet-up w-full max-w-md space-y-4 rounded-3xl p-5">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-900">Compartir perfil</p>
              <p className="text-xs text-slate-500">{titulo}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-white"><XIcon width={18} height={18} /></button>
          </header>

          <div className="flex items-center gap-2">
            <input
              ref={campo}
              readOnly
              value={enlace}
              aria-label="Enlace del perfil"
              onFocus={(event) => event.target.select()}
              className="glass-field min-w-0 flex-1 px-3 py-2.5 text-sm text-slate-600"
            />
            <button type="button" onClick={copiar} className="glass-btn shrink-0 px-4 py-2.5 text-sm">
              {copiado ? <CheckCircleIcon width={16} height={16} /> : <LinkIcon width={16} height={16} />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${texto ?? titulo} ${enlace}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-chip justify-center px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              <WhatsAppIcon width={17} height={17} className="text-emerald-600" />
              WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(enlace)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-chip justify-center px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              <FacebookIcon width={17} height={17} className="text-[#1877f2]" />
              Facebook
            </a>
          </div>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
