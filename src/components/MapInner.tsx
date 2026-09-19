"use client";

import { useState } from "react";
import { divIcon, latLng, type Map as LeafletMap } from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { MapPoint } from "@/components/MapView";
import { BotonUbicarme, Yo } from "@/components/mapa/Yo";

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

type Props = {
  points: MapPoint[];
  className: string;
  /** Centro fijo (la ubicación del usuario); sin él, el promedio de los puntos. */
  centro?: { lat: number; lng: number } | null;
  /** Dibuja el círculo de la búsqueda. */
  radioKm?: number;
  /** Puntito del usuario y botón "Ubicarme ahora". */
  enVivo?: boolean;
};

export default function MapInner({ points, className, centro, radioKm, enVivo = false }: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const center: [number, number] = centro
    ? [centro.lat, centro.lng]
    : points.length
      ? [points.reduce((n, p) => n + p.latitude, 0) / points.length, points.reduce((n, p) => n + p.longitude, 0) / points.length]
      : [-27.4692, -58.8306];

  // Con radio, el mapa arranca encuadrando el círculo entero, sea cual sea el
  // ancho de la pantalla (con un zoom fijo, en el celular quedaba cortado).
  const encuadre = centro && radioKm ? { bounds: latLng(centro.lat, centro.lng).toBounds(radioKm * 2000), boundsOptions: { padding: [8, 8] as [number, number] } } : { center, zoom: 12 };

  return (
    // isolate: los paneles de Leaflet (z 400+) y el botón de ubicarme (z 500)
    // quedan adentro del mapa y no pasan por encima del encabezado al scrollear.
    <div className="relative isolate">
      <MapContainer ref={setMap} {...encuadre} scrollWheelZoom className={`z-0 w-full rounded-2xl ${className}`}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {centro && radioKm && <Circle center={[centro.lat, centro.lng]} radius={radioKm * 1000} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.04 }} />}
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
        {enVivo && <Yo />}
      </MapContainer>
      {enVivo && <BotonUbicarme map={map} className="top-3 right-3" />}
    </div>
  );
}
