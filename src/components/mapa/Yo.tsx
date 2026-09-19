"use client";

import { useState } from "react";
import { divIcon, type Map as LeafletMap } from "leaflet";
import { Circle, Marker } from "react-leaflet";
import { useUbicacion } from "@/components/UbicacionEnVivo";

/* Solo lo importan los componentes de Leaflet, que se cargan en el navegador
   (dynamic con ssr:false): leaflet toca `window` al importarse. */

const yoIcon = divIcon({
  className: "servired-yo",
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,.3)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** El puntito del usuario, con el halo de la precisión del GPS. */
export function Yo() {
  const { posicion, precision } = useUbicacion();
  if (!posicion) return null;
  return (
    <>
      {precision != null && precision < 3000 && <Circle center={[posicion.lat, posicion.lng]} radius={precision} pathOptions={{ color: "#2563eb", weight: 0, fillOpacity: 0.12 }} />}
      <Marker position={[posicion.lat, posicion.lng]} icon={yoIcon} title="Tu ubicación" zIndexOffset={1000} />
    </>
  );
}

/**
 * Va afuera del MapContainer (encima) para que el clic no le llegue al mapa.
 * En el celular es solo el ícono: con el texto se encimaba con la tarjeta del
 * profesional elegido.
 */
export function BotonUbicarme({ map, className = "" }: { map: LeafletMap | null; className?: string }) {
  const { ubicarmeAhora, posicion } = useUbicacion();
  const [buscando, setBuscando] = useState(false);
  return (
    <button
      type="button"
      aria-label="Ubicarme ahora"
      disabled={buscando}
      onClick={async () => {
        setBuscando(true);
        const punto = (await ubicarmeAhora()) ?? posicion;
        setBuscando(false);
        if (punto && map) map.setView([punto.lat, punto.lng], Math.max(map.getZoom(), 14));
      }}
      title="Ubicarme ahora"
      className={`glass glass-solid absolute z-[500] flex size-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-cliente-dark shadow-lg disabled:opacity-60 sm:size-auto sm:px-3 sm:py-2 ${className}`}
    >
      <span aria-hidden className={buscando ? "animate-pulse" : ""}>📍</span>
      <span className="hidden sm:inline">{buscando ? "Buscando…" : "Ubicarme ahora"}</span>
    </button>
  );
}
