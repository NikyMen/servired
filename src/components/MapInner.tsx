"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { MapPoint } from "@/components/MapView";

const COLORS = { profesional: "#059669", solicitud: "#2563eb", trabajo: "#f59e0b" };

function markerIcon(type: MapPoint["type"]) {
  return divIcon({
    className: "servired-map-marker",
    html: `<span style="background:${COLORS[type]}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

export default function MapInner({ points, className }: { points: MapPoint[]; className: string }) {
  const center: [number, number] = points.length
    ? [points.reduce((n, p) => n + p.latitude, 0) / points.length, points.reduce((n, p) => n + p.longitude, 0) / points.length]
    : [-27.4692, -58.8306];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className={`z-0 w-full rounded-2xl ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <Marker key={`${point.type}-${point.id}`} position={[point.latitude, point.longitude]} icon={markerIcon(point.type)}>
          <Popup>
            <div className="min-w-40">
              <p className="font-semibold">{point.title}</p>
              {point.subtitle && <p className="text-xs text-slate-600">{point.subtitle}</p>}
              {point.href && <a href={point.href} className="mt-1 inline-block text-xs font-semibold text-blue-700">Ver ficha</a>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

