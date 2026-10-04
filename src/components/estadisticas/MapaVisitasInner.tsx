"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import type { PuntoMapa } from "@/components/estadisticas/MapaVisitas";

/** Corrientes Capital: el centro si no hay puntos. */
const CENTRO: [number, number] = [-27.4692, -58.8306];

export default function MapaVisitasInner({ puntos, unidad }: { puntos: PuntoMapa[]; unidad: string }) {
  const max = Math.max(1, ...puntos.map((p) => p.cantidad));
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  // Encuadra todos los puntos; con uno solo, un zoom de ciudad.
  const encuadre = puntos.length > 1
    ? { bounds: [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]] as [[number, number], [number, number]], boundsOptions: { padding: [30, 30] as [number, number], maxZoom: 11 } }
    : { center: puntos[0] ? ([puntos[0].lat, puntos[0].lng] as [number, number]) : CENTRO, zoom: 10 };
  return (
    <MapContainer {...encuadre} scrollWheelZoom={false} className="z-0 h-80 w-full rounded-xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {puntos.map((p) => (
        // El área crece con la cantidad (radio ∝ raíz), con un mínimo que se pueda tocar.
        <CircleMarker key={p.nombre} center={[p.lat, p.lng]} radius={6 + 22 * Math.sqrt(p.cantidad / max)}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#4f46e5", fillOpacity: 0.6 }}>
          <Tooltip>{p.nombre}: {p.cantidad} {unidad}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
