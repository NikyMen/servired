"use client";

import { useState } from "react";
import { MapPinIcon } from "@/components/icons";
import { useUbicacion } from "@/components/UbicacionEnVivo";

/**
 * De dónde salen los 10 km, solo cuando NO es la ubicación real: con el GPS
 * activo no se dice nada (el mapa ya lo muestra). `origen` es lo que usó el
 * servidor para esta página; el estado del GPS lo sabe el navegador. Sin
 * permiso se usa la localidad, y "Ubicarme ahora" lo vuelve a pedir o explica
 * cómo habilitarlo.
 */
export function AvisoUbicacion({ origen, localidad }: { origen: "gps" | "localidad"; localidad: string }) {
  const { estado, ubicarmeAhora } = useUbicacion();
  const [pidiendo, setPidiendo] = useState(false);

  if (origen === "gps" || estado === "activo") return null;
  const texto = estado === "buscando" || pidiendo ? "Buscando tu ubicación…" : `Usando tu localidad: ${localidad}.`;

  return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <MapPinIcon width={16} height={16} className="shrink-0 text-cliente" />
      <span>{texto}</span>
      <button type="button" disabled={pidiendo} onClick={async () => { setPidiendo(true); await ubicarmeAhora(); setPidiendo(false); }} className="font-semibold text-cliente-dark hover:underline disabled:opacity-60">
        Ubicarme ahora
      </button>
      {estado === "denegado" && <span className="w-full text-xs text-slate-500">No tenemos permiso para ver tu ubicación. Habilitalo en los permisos del navegador (el candado junto a la dirección) y tocá “Ubicarme ahora”.</span>}
    </div>
  );
}
