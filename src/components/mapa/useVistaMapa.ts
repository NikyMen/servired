"use client";

import { useEffect, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { DIAMETRO_ZONA_M } from "@/lib/geo";

/** Conserva un margen para no montar y desmontar zonas durante el arrastre. */
export function useVistaMapa() {
  const map = useMap();
  const leer = () => {
    const bounds = map.getBounds().pad(0.2);
    // Incluye círculos cuyo centro quedó afuera pero todavía cruzan el borde.
    const noreste = bounds.getNorthEast().toBounds(DIAMETRO_ZONA_M).getNorthEast();
    bounds.extend(bounds.getSouthWest().toBounds(DIAMETRO_ZONA_M).getSouthWest());
    bounds.extend(noreste);
    return { bounds, etiquetas: map.getZoom() >= 13 };
  };
  const [vista, setVista] = useState(leer);
  useMapEvents({ moveend: () => setVista(leer()) });
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return vista;
}
