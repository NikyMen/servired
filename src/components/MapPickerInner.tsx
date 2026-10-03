"use client";

import { useEffect } from "react";
import { divIcon, latLng } from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const icon = divIcon({ className: "servired-map-marker", html: '<span style="background:#2563eb"></span>', iconSize: [28, 28], iconAnchor: [14, 28] });

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (event) => onChange(event.latlng.lat, event.latlng.lng) });
  return null;
}

/** Si el punto cambia desde afuera (otra localidad elegida) y quedó fuera de la vista, el mapa lo sigue. */
function Seguir({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains(latLng(latitude, longitude))) map.panTo([latitude, longitude]);
  }, [map, latitude, longitude]);
  return null;
}

type Props = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
  /** Dibuja la zona alrededor del punto (en metros) en lugar del pin. */
  radioM?: number;
  /** Sin marca: el mapa se centra en el punto pero no lo dibuja hasta el primer toque. */
  sinMarca?: boolean;
};

export default function MapPickerInner({ latitude, longitude, onChange, radioM, sinMarca = false }: Props) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={radioM ? 15 : 13} className="z-0 h-64 w-full rounded-2xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {!sinMarca && (radioM
        ? <Circle center={[latitude, longitude]} radius={radioM} pathOptions={{ color: "#059669", weight: 2, fillOpacity: 0.18 }} />
        : <Marker position={[latitude, longitude]} icon={icon} />)}
      <Seguir latitude={latitude} longitude={longitude} />
      <ClickHandler onChange={onChange} />
    </MapContainer>
  );
}
