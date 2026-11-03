"use client";

import { memo, useEffect, useState } from "react";
import { latLng, type Map as LeafletMap } from "leaflet";
import { Circle, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { DIAMETRO_ZONA_M, RADIO_KM, type Punto } from "@/lib/geo";
import { Avatar } from "@/components/ui";
import { BotonUbicarme, Yo } from "@/components/mapa/Yo";
import { BotonMiZona } from "@/components/mapa/BotonMiZona";
import { useVistaMapa } from "@/components/mapa/useVistaMapa";
import type { ItemMapa } from "@/components/mapa/MapaCompleto";

type Props = { items: ItemMapa[]; centro: Punto; seleccionado: string | null; onSeleccionar: (id: string) => void; editarZona?: boolean; className?: string };

const Zona = memo(function Zona({ item, elegida, etiquetas, onSeleccionar }: { item: ItemMapa; elegida: boolean; etiquetas: boolean; onSeleccionar: Props["onSeleccionar"] }) {
  return (
    <Circle
      center={[item.lat, item.lng]}
      radius={DIAMETRO_ZONA_M / 2}
      pathOptions={{ color: elegida ? "#047857" : "#059669", weight: elegida ? 3 : 2, fillOpacity: elegida ? 0.3 : item.zona ? 0.22 : 0.1, dashArray: item.zona ? undefined : "4 5" }}
      eventHandlers={{ click: () => onSeleccionar(item.id) }}
    >
      <Tooltip key={etiquetas || elegida ? "fija" : "hover"} permanent={etiquetas || elegida} interactive direction="top" offset={[0, -6]} className="servired-zona-label">
        <button type="button" onClick={() => onSeleccionar(item.id)} className="flex items-center gap-1.5" aria-label={`Ver ${item.nombre}`}>
          <Avatar name={item.nombre} color={item.avatarColor} src={item.avatarUrl} size={22} />
          <span className="max-w-32 truncate text-xs font-semibold text-slate-800">{item.nombre}</span>
        </button>
      </Tooltip>
    </Circle>
  );
});

function Zonas({ items, seleccionado, onSeleccionar }: Pick<Props, "items" | "seleccionado" | "onSeleccionar">) {
  const { bounds, etiquetas } = useVistaMapa();
  return items.filter((item) => bounds.contains([item.lat, item.lng]) || item.id === seleccionado).map((item) => (
    <Zona key={item.id} item={item} elegida={item.id === seleccionado} etiquetas={etiquetas} onSeleccionar={onSeleccionar} />
  ));
}

function MapaCompletoInner({ items, centro, seleccionado, onSeleccionar, editarZona = false, className = "" }: Props) {
  const elegido = items.find((i) => i.id === seleccionado);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const lat = elegido?.lat;
  const lng = elegido?.lng;

  useEffect(() => {
    if (lat != null && lng != null && map) map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: false });
  }, [lat, lng, map]);

  return (
    <div className={`relative isolate ${className}`}>
      <MapContainer ref={setMap} preferCanvas bounds={latLng(centro.lat, centro.lng).toBounds(RADIO_KM * 2000)} boundsOptions={{ padding: [8, 8] }} scrollWheelZoom className="z-0 h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" updateWhenIdle updateWhenZooming={false} keepBuffer={1} />
        <Circle center={[centro.lat, centro.lng]} radius={RADIO_KM * 1000} interactive={false} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.04 }} />
        <Zonas items={items} seleccionado={seleccionado} onSeleccionar={onSeleccionar} />
        <Yo />
      </MapContainer>
      <BotonUbicarme map={map} className="top-3 right-3" />
      {editarZona && <BotonMiZona className="top-16 right-3" />}
    </div>
  );
}

export default memo(MapaCompletoInner);
