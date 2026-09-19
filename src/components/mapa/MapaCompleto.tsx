"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Avatar, MatriculadoBadge, VerifiedBadge } from "@/components/ui";
import { RADIO_KM, type Punto } from "@/lib/geo";

export type ItemMapa = Punto & {
  id: string;
  nombre: string;
  oficio: string;
  avatarUrl: string | null;
  avatarColor: string;
  localidad: string;
  distancia: string;
  verified: boolean;
  matriculado: boolean;
};

const Inner = dynamic(() => import("@/components/mapa/MapaCompletoInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200/70" />,
});

/**
 * La sección Mapa: el mapa ocupa todo el alto y encima va la hoja
 * "Profesionales cerca tuyo" (abajo en el celular, al costado en la compu).
 * Tocar un pin o un ítem muestra el resumen con el acceso al perfil.
 */
export function MapaCompleto({ items, centro }: { items: ItemMapa[]; centro: Punto }) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const elegido = items.find((i) => i.id === seleccionado) ?? null;

  const elegir = (id: string) => { setSeleccionado(id); setHojaAbierta(false); };

  return (
    // isolate: la hoja (z 600) y la tarjeta (z 650) no tapan el encabezado ni la barra de abajo.
    <div className="relative isolate h-full overflow-hidden rounded-2xl md:grid md:grid-cols-[340px_1fr] md:rounded-2xl">
      <aside
        aria-label="Profesionales cerca tuyo"
        className={`glass glass-solid absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-3xl transition-[max-height] md:static md:max-h-none md:rounded-none md:rounded-l-2xl ${hojaAbierta ? "max-h-[65%]" : "max-h-[68px]"}`}
      >
        <button type="button" onClick={() => setHojaAbierta((v) => !v)} aria-expanded={hojaAbierta} className="flex shrink-0 flex-col items-center gap-1 px-4 pt-2 pb-3 md:pointer-events-none md:items-start md:pt-4">
          <span aria-hidden className="h-1 w-10 rounded-full bg-slate-300 md:hidden" />
          <span className="font-bold text-slate-900">Profesionales cerca tuyo</span>
          <span className="text-xs text-slate-500">{items.length ? `${items.length} a ${RADIO_KM} km o menos` : `Nadie a ${RADIO_KM} km con esta búsqueda`}</span>
        </button>
        <ul className="min-h-0 flex-1 divide-y divide-white/70 overflow-y-auto px-2 pb-3">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => elegir(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/60 ${item.id === seleccionado ? "bg-white/70" : ""}`}>
                <Avatar name={item.nombre} color={item.avatarColor} src={item.avatarUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{item.nombre}</span>
                    {item.verified && <VerifiedBadge />}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{item.oficio} · {item.localidad} • {item.distancia}</span>
                </span>
                {item.matriculado && <MatriculadoBadge className="hidden sm:inline-flex" />}
              </button>
            </li>
          ))}
          {!items.length && (
            <li className="px-2 py-3 text-sm text-slate-500">
              Probá con otra búsqueda o <Link href="/publicar-solicitud" className="font-semibold text-cliente-dark hover:underline">publicá una solicitud</Link> y te contactan.
            </li>
          )}
        </ul>
      </aside>

      <Inner items={items} centro={centro} seleccionado={seleccionado} onSeleccionar={elegir} className="h-full" />

      {elegido && (
        <div role="dialog" aria-label={elegido.nombre} className="glass glass-solid absolute top-3 right-16 left-14 z-[650] rounded-2xl p-3 shadow-xl sm:right-auto sm:w-80 md:left-[calc(340px+3.5rem)] md:w-[min(20rem,calc(100%-340px-14rem))]">
          <div className="flex items-start gap-3">
            <Avatar name={elegido.nombre} color={elegido.avatarColor} src={elegido.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold text-slate-900"><span className="truncate">{elegido.nombre}</span>{elegido.verified && <VerifiedBadge />}</p>
              <p className="truncate text-xs text-slate-500">{elegido.oficio}</p>
              <p className="text-xs text-slate-500">{elegido.localidad} • {elegido.distancia}</p>
              {elegido.matriculado && <MatriculadoBadge className="mt-1" />}
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setSeleccionado(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <Link href={`/profesionales/${elegido.id}`} className="mt-2 block rounded-xl bg-cliente px-3 py-2 text-center text-sm font-semibold text-white hover:bg-cliente-dark">Ver perfil</Link>
        </div>
      )}
    </div>
  );
}
