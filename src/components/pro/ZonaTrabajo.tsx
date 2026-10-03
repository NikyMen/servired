"use client";

import { MapPicker } from "@/components/MapPicker";
import { RADIO_ZONA_M, type Punto } from "@/lib/geo";

/**
 * Zona donde el oferente está o trabaja, marcada como un círculo de unas 3
 * cuadras. Es opcional: sin marcar, en el mapa aparece en el punto de su
 * localidad. La usan el alta de Ofrezco y Mi perfil.
 */
export function ZonaTrabajo({ zona, centro, onChange }: { zona: Punto | null; centro: Punto; onChange: (zona: Punto | null) => void }) {
  const punto = zona ?? centro;
  return (
    <section id="ubicacion" className="scroll-mt-28 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Tu zona de trabajo <span className="font-normal text-slate-500">(opcional)</span></p>
          <p className="text-xs text-slate-500">
            {zona
              ? "Así te van a ver en el mapa: una zona de unas 3 cuadras a la redonda, no tu dirección exacta. Tocá otro lugar para moverla."
              : "Tocá el mapa donde estás o donde trabajás. Se muestra como una zona de unas 3 cuadras a la redonda. Si no marcás nada, aparecés en el centro de tu localidad."}
          </p>
        </div>
        {zona && <button type="button" onClick={() => onChange(null)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Quitar zona</button>}
      </div>
      <MapPicker latitude={punto.lat} longitude={punto.lng} radioM={RADIO_ZONA_M} sinMarca={!zona} onChange={(lat, lng) => onChange({ lat, lng })} />
    </section>
  );
}
