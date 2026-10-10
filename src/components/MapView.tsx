"use client";

import dynamic from "next/dynamic";

export type MapPoint = {
  id: string;
  type: "profesional" | "solicitud" | "trabajo";
  title: string;
  subtitle?: string | null;
  latitude: number;
  longitude: number;
  href?: string;
  /** Se dibuja como zona de ese radio (en metros) en vez de pin. */
  radioM?: number;
  /** Foto o iniciales del profesional, para la etiqueta de su zona. */
  avatar?: { url: string | null; color: string };
  /** No marcó dónde: el punto es uno aproximado de su localidad y se dibuja punteado. */
  aproximado?: boolean;
};

export type Encuadre = { sur: number; oeste: number; norte: number; este: number };

const MapInner = dynamic(() => import("@/components/MapInner"), {
  ssr: false,
  loading: () => <div className="h-full min-h-72 animate-pulse rounded-2xl bg-slate-200/70" />,
});

export function MapView({ points, className = "h-[430px]", centro, radioKm, enVivo, editarZona, zonas, encuadre }: { points: MapPoint[]; className?: string; centro?: { lat: number; lng: number } | null; radioKm?: number; enVivo?: boolean; editarZona?: boolean; zonas?: boolean; encuadre?: Encuadre | null }) {
  return <MapInner points={points} className={className} centro={centro} radioKm={radioKm} enVivo={enVivo} editarZona={editarZona} zonas={zonas} encuadre={encuadre} />;
}

