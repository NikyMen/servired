"use client";

import { useState } from "react";
import { MapPinIcon } from "@/components/icons";
import { useUbicacion } from "@/components/UbicacionEnVivo";
import { RADIO_KM } from "@/lib/geo";

/**
 * De dónde salen los 20 km. `origen` es lo que usó el servidor para esta
 * página; el estado del GPS lo sabe el navegador. Sin permiso se usa la
 * localidad, y "Ubicarme ahora" lo vuelve a pedir o explica cómo habilitarlo.
 */
export function AvisoUbicacion({ origen, localidad }: { origen: "gps" | "localidad"; localidad: string }) {
  const { estado, ubicarmeAhora } = useUbicacion();
  const [pidiendo, setPidiendo] = useState(false);

  let texto: string;
  if (origen === "gps" || estado === "activo") texto = `Mostrando lo que está a ${RADIO_KM} km de tu ubicación.`;
  else if (estado === "buscando" || pidiendo) texto = "Buscando tu ubicación…";
  else texto = `Usando tu localidad: ${localidad}.`;
  const ofrecerBoton = origen !== "gps" && estado !== "activo";

  return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <MapPinIcon width={16} height={16} className="shrink-0 text-cliente" />
      <span>{texto}</span>
      {ofrecerBoton && (
        <button type="button" disabled={pidiendo} onClick={async () => { setPidiendo(true); await ubicarmeAhora(); setPidiendo(false); }} className="font-semibold text-cliente-dark hover:underline disabled:opacity-60">
          Ubicarme ahora
        </button>
      )}
      {estado === "denegado" && <span className="w-full text-xs text-slate-500">No tenemos permiso para ver tu ubicación. Habilitalo en los permisos del navegador (el candado junto a la dirección) y tocá “Ubicarme ahora”.</span>}
    </div>
  );
}
