"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

export type PuntoMapa = { nombre: string; lat: number; lng: number; cantidad: number };

const MapaVisitasInner = dynamic(() => import("@/components/estadisticas/MapaVisitasInner"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-slate-100" />,
});

/** Mapa con burbujas: visitas por ciudad (IP) o usuarios por localidad elegida. */
export function MapaVisitas({ visitas, usuarios }: { visitas: PuntoMapa[]; usuarios: PuntoMapa[] }) {
  const [capa, setCapa] = useState<"visitas" | "usuarios">(visitas.length ? "visitas" : "usuarios");
  const puntos = capa === "visitas" ? visitas : usuarios;
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Qué mostrar en el mapa" className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
        {([["visitas", "Visitas del período"], ["usuarios", "Usuarios registrados"]] as const).map(([valor, nombre]) => (
          <button key={valor} type="button" aria-pressed={capa === valor} onClick={() => setCapa(valor)}
            className={`rounded-md px-2.5 py-1.5 ${capa === valor ? "bg-[var(--adm-accent)] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {nombre}
          </button>
        ))}
      </div>
      {puntos.length
        ? <MapaVisitasInner key={capa} puntos={puntos} unidad={capa === "visitas" ? "visitas" : "usuarios"} />
        : <p className="flex h-80 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">{capa === "visitas" ? "Todavía no hay visitas con ubicación en este período." : "Nadie eligió localidad todavía."}</p>}
    </div>
  );
}
