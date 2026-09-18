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
};

const MapInner = dynamic(() => import("@/components/MapInner"), {
  ssr: false,
  loading: () => <div className="h-full min-h-72 animate-pulse rounded-2xl bg-slate-200/70" />,
});

export function MapView({ points, className = "h-[430px]", centro, radioKm, enVivo }: { points: MapPoint[]; className?: string; centro?: { lat: number; lng: number } | null; radioKm?: number; enVivo?: boolean }) {
  return <MapInner points={points} className={className} centro={centro} radioKm={radioKm} enVivo={enVivo} />;
}

