"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const icon = divIcon({ className: "servired-map-marker", html: '<span style="background:#2563eb"></span>', iconSize: [28, 28], iconAnchor: [14, 28] });

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (event) => onChange(event.latlng.lat, event.latlng.lng) });
  return null;
}

export default function MapPickerInner({ latitude, longitude, onChange }: { latitude: number; longitude: number; onChange: (latitude: number, longitude: number) => void }) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={13} className="z-0 h-64 w-full rounded-2xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[latitude, longitude]} icon={icon} />
      <ClickHandler onChange={onChange} />
    </MapContainer>
  );
}
