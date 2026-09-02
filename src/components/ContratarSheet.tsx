"use client";

import { useEffect, useState } from "react";
import { ContratarBox } from "@/components/ContratarBox";
import { XIcon } from "@/components/icons";

type ServiceOption = { id: string; title: string; priceFrom: number };

/** Propuesta en móvil: barra fija abajo que abre el formulario. */
export function ContratarSheet({
  professionalId,
  proName,
  services,
}: {
  professionalId: string;
  proName: string;
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-white/60 px-4 pt-3 lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => setOpen(true)}
          className="glass-btn min-h-[48px] w-full text-sm"
        >
          Enviar solicitud de trabajo
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div
            className="glass glass-solid animate-sheet-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Solicitud para {proName}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <XIcon width={20} height={20} />
              </button>
            </div>
            <ContratarBox professionalId={professionalId} services={services} frame={false} />
          </div>
        </div>
      )}
    </>
  );
}
