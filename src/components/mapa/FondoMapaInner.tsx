"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const CENTRO: [number, number] = [-27.4692, -58.8306];

/* Pines de adorno, a mano alrededor del centro: NO son perfiles reales. El
   invitado no recibe ninguna coordenada de nadie. */
const ADORNOS: { d: [number, number]; color: string }[] = [
  { d: [0.004, -0.006], color: "#059669" },
  { d: [-0.003, 0.005], color: "#059669" },
  { d: [0.007, 0.009], color: "#2563eb" },
  { d: [-0.008, -0.004], color: "#059669" },
  { d: [0.001, 0.014], color: "#f59e0b" },
  { d: [-0.006, 0.012], color: "#2563eb" },
  { d: [0.009, -0.013], color: "#059669" },
  { d: [-0.011, 0.002], color: "#f59e0b" },
];

const pin = (color: string) => divIcon({ className: "servired-map-marker", html: `<span style="background:${color}"></span>`, iconSize: [28, 28], iconAnchor: [14, 28] });

/** Mapa quieto de fondo: sin arrastre, sin zoom, sin clics. */
export default function FondoMapaInner() {
  return (
    <MapContainer
      center={CENTRO}
      zoom={14}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      className="pointer-events-none z-0 h-full w-full"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {ADORNOS.map(({ d, color }, i) => <Marker key={i} position={[CENTRO[0] + d[0], CENTRO[1] + d[1]]} icon={pin(color)} interactive={false} />)}
    </MapContainer>
  );
}
