"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { divIcon, latLng, latLngBounds, type Map as LeafletMap } from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Encuadre, MapPoint } from "@/components/MapView";
import { Avatar } from "@/components/ui";
import { BotonUbicarme, Yo } from "@/components/mapa/Yo";
import { BotonMiZona } from "@/components/mapa/BotonMiZona";
import { DIAMETRO_ZONA_M } from "@/lib/geo";

const COLORS = { profesional: "#059669", solicitud: "#2563eb", trabajo: "#f59e0b" };

/** Desde este zoom las zonas de los profesionales llevan su etiqueta fija; más lejos se pisarían. */
const ZOOM_ETIQUETAS = 13;

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
  /** Quien ofrece servicios ve el acceso a editar su zona de trabajo. */
  editarZona?: boolean;
  /** Cada punto es un círculo de unas 3 cuadras y media en vez de un pin. */
  zonas?: boolean;
  /** Encuadre inicial fijo (p. ej. Corrientes Capital); le gana al del círculo. */
  encuadre?: Encuadre | null;
};

function Popupcito({ point }: { point: MapPoint }) {
  return (
    <Popup>
      <div className="min-w-40">
        <p className="font-semibold">{point.title}</p>
        {point.subtitle && <p className="text-xs text-slate-600">{point.subtitle}</p>}
        {point.href && <a href={point.href} className="mt-1 inline-block text-xs font-semibold text-blue-700">Ver ficha</a>}
      </div>
    </Popup>
  );
}

/**
 * Las zonas circulares de cada uno. La del profesional muestra su foto y nombre, y
 * un toque (en la zona o en la etiqueta) lleva a su perfil. Las solicitudes y
 * los trabajos siguen abriendo su ficha chica.
 */
function Zonas({ points }: { points: MapPoint[] }) {
  const router = useRouter();
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const fijas = zoom >= ZOOM_ETIQUETAS;

  return points.map((point) => {
    const center: [number, number] = [point.latitude, point.longitude];
    const color = COLORS[point.type];
    const key = `${point.type}-${point.id}`;
    // Punteada y más tenue: es una zona aproximada, no la que marcó.
    const trazo = point.aproximado ? { color, weight: 2, fillOpacity: 0.1, dashArray: "4 5" } : { color, weight: 2, fillOpacity: 0.22 };
    if (point.type !== "profesional") {
      return (
        <Circle key={key} center={center} radius={DIAMETRO_ZONA_M / 2} pathOptions={trazo}>
          <Popupcito point={point} />
        </Circle>
      );
    }
    const irAlPerfil = () => point.href && router.push(point.href);
    return (
      <Circle key={key} center={center} radius={DIAMETRO_ZONA_M / 2} pathOptions={trazo} eventHandlers={{ click: irAlPerfil }}>
        {/* permanent solo se lee al crear el tooltip: la key lo rearma al cruzar el zoom. */}
        <Tooltip key={fijas ? "fija" : "hover"} permanent={fijas} interactive direction="top" offset={[0, -6]} className="servired-zona-label">
          <a
            href={point.href}
            onClick={(e) => {
              e.preventDefault();
              irAlPerfil();
            }}
            className="flex items-center gap-1.5"
            title={point.subtitle ?? undefined}
          >
            <Avatar name={point.title} color={point.avatar?.color} src={point.avatar?.url} size={22} />
            <span className="max-w-32 truncate text-xs font-semibold text-slate-800">{point.title}</span>
          </a>
        </Tooltip>
      </Circle>
    );
  });
}

export default function MapInner({ points, className, centro, radioKm, enVivo = false, editarZona = false, zonas = false, encuadre }: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const center: [number, number] = centro
    ? [centro.lat, centro.lng]
    : points.length
      ? [points.reduce((n, p) => n + p.latitude, 0) / points.length, points.reduce((n, p) => n + p.longitude, 0) / points.length]
      : [-27.4692, -58.8306];

  // Con radio, el mapa arranca encuadrando el círculo entero, sea cual sea el
  // ancho de la pantalla (con un zoom fijo, en el celular quedaba cortado).
  // Una sola zona (perfil del oferente): de cerca, para que se lean las cuadras.
  const padding = { boundsOptions: { padding: [8, 8] as [number, number] } };
  const inicio = encuadre
    ? { bounds: latLngBounds([encuadre.sur, encuadre.oeste], [encuadre.norte, encuadre.este]), ...padding }
    : centro && radioKm
      ? { bounds: latLng(centro.lat, centro.lng).toBounds(radioKm * 2000), ...padding }
      : { center, zoom: points.length === 1 && points[0].radioM ? 15 : 12 };

  return (
    // isolate: los paneles de Leaflet (z 400+) y el botón de ubicarme (z 500)
    // quedan adentro del mapa y no pasan por encima del encabezado al scrollear.
    <div className="relative isolate">
      <MapContainer ref={setMap} {...inicio} scrollWheelZoom className={`z-0 w-full rounded-2xl ${className}`}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {centro && radioKm && <Circle center={[centro.lat, centro.lng]} radius={radioKm * 1000} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.04 }} />}
        {zonas ? (
          <Zonas points={points} />
        ) : (
          points.map((point) =>
            point.radioM ? (
              <Circle key={`${point.type}-${point.id}`} center={[point.latitude, point.longitude]} radius={point.radioM} pathOptions={{ color: COLORS[point.type], weight: 2, fillOpacity: 0.18 }}><Popupcito point={point} /></Circle>
            ) : (
              <Marker key={`${point.type}-${point.id}`} position={[point.latitude, point.longitude]} icon={markerIcon(point.type)}><Popupcito point={point} /></Marker>
            ),
          )
        )}
        {enVivo && <Yo />}
      </MapContainer>
      {enVivo && <BotonUbicarme map={map} className="top-3 right-3" />}
      {editarZona && <BotonMiZona className={enVivo ? "top-16 right-3" : "top-3 right-3"} />}
    </div>
  );
}
