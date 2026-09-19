"use client";

import { useEffect, useMemo, useState } from "react";
import { divIcon, latLng, type Map as LeafletMap } from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { agruparPuntos, RADIO_KM, type Punto } from "@/lib/geo";
import { BotonUbicarme, Yo } from "@/components/mapa/Yo";
import type { ItemMapa } from "@/components/mapa/MapaCompleto";

const pinPro = divIcon({ className: "servired-map-marker", html: '<span style="background:#059669"></span>', iconSize: [28, 28], iconAnchor: [14, 28] });
const pinElegido = divIcon({ className: "servired-map-marker", html: '<span style="background:#047857;transform:rotate(-45deg) scale(1.25)"></span>', iconSize: [28, 28], iconAnchor: [14, 28] });

function iconoGrupo(cantidad: number) {
  const lado = cantidad < 10 ? 36 : cantidad < 50 ? 42 : 48;
  return divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${lado}px;height:${lado}px;border-radius:9999px;background:#059669;color:#fff;font-weight:700;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.35)">${cantidad}</span>`,
    iconSize: [lado, lado],
    iconAnchor: [lado / 2, lado / 2],
  });
}

function Zoom({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

type Props = { items: ItemMapa[]; centro: Punto; seleccionado: string | null; onSeleccionar: (id: string) => void; className?: string };

export default function MapaCompletoInner({ items, centro, seleccionado, onSeleccionar, className = "" }: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(11);
  // Los grupos se rearman con cada zoom: de lejos se juntan, de cerca se abren.
  const grupos = useMemo(() => agruparPuntos(items, zoom), [items, zoom]);

  // El zoom real sale del encuadre del círculo, que depende del tamaño del mapa.
  useEffect(() => {
    if (map) setZoom(map.getZoom());
  }, [map]);

  // Elegido desde la lista: el mapa va hasta él.
  useEffect(() => {
    const item = items.find((i) => i.id === seleccionado);
    if (item && map) map.flyTo([item.lat, item.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [seleccionado, items, map]);

  return (
    <div className={`relative isolate ${className}`}>
      <MapContainer ref={setMap} bounds={latLng(centro.lat, centro.lng).toBounds(RADIO_KM * 2000)} boundsOptions={{ padding: [8, 8] }} scrollWheelZoom className="z-0 h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Zoom onZoom={setZoom} />
        <Circle center={[centro.lat, centro.lng]} radius={RADIO_KM * 1000} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.04 }} />
        {grupos.map((grupo) =>
          grupo.items.length === 1 ? (
            <Marker
              key={grupo.items[0].id}
              position={[grupo.lat, grupo.lng]}
              icon={grupo.items[0].id === seleccionado ? pinElegido : pinPro}
              title={grupo.items[0].nombre}
              eventHandlers={{ click: () => onSeleccionar(grupo.items[0].id) }}
            />
          ) : (
            <Marker
              key={grupo.items.map((i) => i.id).join(",")}
              position={[grupo.lat, grupo.lng]}
              icon={iconoGrupo(grupo.items.length)}
              title={`${grupo.items.length} profesionales`}
              eventHandlers={{ click: () => map?.flyTo([grupo.lat, grupo.lng], Math.min((map?.getZoom() ?? 11) + 2, 18), { duration: 0.5 }) }}
            />
          ),
        )}
        <Yo />
      </MapContainer>
      <BotonUbicarme map={map} className="top-3 right-3" />
    </div>
  );
}
