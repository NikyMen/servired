"use client";

import { useEffect, useState } from "react";
import { ContratarBox } from "@/components/ContratarBox";
import { formatARS } from "@/lib/format";
import { XIcon } from "@/components/icons";

type ServiceOption = { id: string; title: string; priceFrom: number };

/**
 * Contratación en móvil: barra fija abajo (precio + CTA) que abre un
 * bottom sheet con el formulario. En desktop no se muestra (lo cubre el aside).
 */
export function ContratarSheet({
  professionalId,
  proName,
  priceFrom,
  services,
}: {
  professionalId: string;
  proName: string;
  priceFrom: number;
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);

  // Bloquea el scroll del fondo mientras el sheet está abierto
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
      {/* Barra fija de contratación (solo móvil) */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="shrink-0">
          <p className="text-xs text-slate-400">Desde</p>
          <p className="text-lg font-bold leading-tight text-slate-900">
            {formatARS(priceFrom)}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="min-h-[48px] flex-1 rounded-xl bg-cliente text-sm font-semibold text-white transition-all hover:bg-cliente-dark active:scale-[0.98]"
        >
          Contratar
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <div
            className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Contratar a {proName}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <XIcon width={20} height={20} />
              </button>
            </div>
            <ContratarBox
              professionalId={professionalId}
              services={services}
              frame={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
