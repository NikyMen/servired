"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPinIcon } from "@/components/icons";
import { RADIO_KM } from "@/lib/geo";

const Fondo = dynamic(() => import("@/components/mapa/FondoMapaInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#e8eef5]" />,
});

/**
 * Lo que ve un invitado en lugar del mapa: un mapa de verdad pero difuminado,
 * para que se note qué hay detrás, y la invitación a entrar. Los pines son de
 * adorno: no lleva ninguna ubicación real.
 */
export function MapaBloqueado({ className = "h-[430px]", next = "/mapa" }: { className?: string; next?: string }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-white/70 bg-[#e8eef5] ${className}`}>
      <div aria-hidden className="absolute inset-0 -z-10 scale-105 blur-[3px] saturate-[.85]">
        <Fondo />
      </div>
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white/35 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-cliente text-white shadow-lg"><MapPinIcon width={22} height={22} /></span>
        <p className="text-lg font-bold text-slate-900">Iniciá sesión para ver el mapa</p>
        <p className="max-w-sm text-sm text-slate-700">Con tu cuenta ves en el mapa a los profesionales que tenés a {RADIO_KM} km y la distancia a cada uno.</p>
        <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="rounded-xl bg-cliente px-4 py-2.5 text-sm font-semibold text-white hover:bg-cliente-dark">Iniciar sesión</Link>
      </div>
      <span className="absolute right-2 bottom-1 text-[10px] text-slate-600">© OpenStreetMap</span>
    </div>
  );
}
