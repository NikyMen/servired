"use client";

import { useState } from "react";
import { saveAdAction, swapAdsAction } from "@/app/admin/actions";
import { AdCropper } from "@/components/AdCropper";
import { LADO_PLACA, PLACAS, UBICACIONES } from "@/lib/publicidad";

export type AdminAd = {
  slot: string;
  title: string;
  imageUrl: string | null;
  whatsappPhone: string | null;
  whatsappMessage: string | null;
  enabled: boolean;
  reencuadrar: boolean;
};

/** Miniatura de la placa. Sin link: acá no se abre WhatsApp, se administra. */
function Miniatura({ ad, size = 56 }: { ad: AdminAd | undefined; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100" style={{ width: size, height: size }}>
      {ad?.imageUrl
        ? <img src={ad.imageUrl} alt="" className="size-full object-cover" />
        : <span className="text-[9px] font-bold tracking-[.14em] text-slate-400">ADS</span>}
    </span>
  );
}

function estadoDe(ad: AdminAd | undefined) {
  if (!ad?.imageUrl) return { texto: "Sin imagen", clase: "adm-badge-warn" };
  return ad.enabled ? { texto: "Activa", clase: "adm-badge-ok" } : { texto: "Pausada", clase: "adm-badge" };
}

/**
 * Las placas de la portada, todas en una sola lista. Son todas iguales
 * (cuadradas, 800 × 800): lo único que las diferencia es dónde aparecen, así
 * que cambiar una de lugar es intercambiarla con otra, y eso es un botón.
 */
export function AdminPublicidad({ ads }: { ads: AdminAd[] }) {
  const porSlot = new Map(ads.map((ad) => [ad.slot, ad]));
  const [moviendo, setMoviendo] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="adm-card adm-card-pad flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
        <p><strong className="text-slate-900">{PLACAS.length} lugares</strong> en la portada</p>
        <p><strong className="text-slate-900">{ads.filter((a) => a.imageUrl && a.enabled).length}</strong> activas</p>
        <p className="text-xs text-slate-500">Todas las placas son cuadradas de {LADO_PLACA} × {LADO_PLACA} px. La misma imagen sirve para cualquier lugar: para moverla, usá <strong>Mover</strong> y elegí con cuál se intercambia.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {PLACAS.map((placa, i) => {
          const ad = porSlot.get(placa.slot);
          const estado = estadoDe(ad);
          const anterior = PLACAS[i - 1];
          const siguiente = PLACAS[i + 1];
          const abierta = moviendo === placa.slot;

          return (
            <section key={placa.slot} className="adm-card">
              <div className="adm-card-head">
                <div className="flex min-w-0 items-center gap-3">
                  <Miniatura ad={ad} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{placa.nombre}</h3>
                      <span className={`adm-badge ${estado.clase}`}>{estado.texto}</span>
                      {ad?.reencuadrar && <span className="adm-badge adm-badge-warn">Conviene reencuadrar</span>}
                    </div>
                    <p className="truncate text-xs text-slate-500">{UBICACIONES[placa.ubicacion].donde}</p>
                  </div>
                </div>

                {/* Cambiar de lugar. Va afuera del form de abajo: no se pueden
                    anidar formularios, y cada destino es su propio form. */}
                <div className="flex items-center gap-1.5">
                  <MoverBoton desde={placa.slot} hasta={anterior?.slot} etiqueta="◀" titulo={anterior ? `Intercambiar con ${anterior.nombre}` : "Es la primera"} />
                  <MoverBoton desde={placa.slot} hasta={siguiente?.slot} etiqueta="▶" titulo={siguiente ? `Intercambiar con ${siguiente.nombre}` : "Es la última"} />
                  <button type="button" onClick={() => setMoviendo(abierta ? null : placa.slot)} aria-expanded={abierta} className="adm-btn adm-btn-ghost adm-btn-sm">
                    {abierta ? "Cancelar" : "Mover"}
                  </button>
                </div>
              </div>

              {abierta && (
                <div className="border-b border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">Elegí con qué lugar se intercambia. Las dos placas cambian de lugar: no se pierde ninguna.</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PLACAS.filter((otra) => otra.slot !== placa.slot).map((otra) => (
                      <form key={otra.slot} action={swapAdsAction.bind(null, placa.slot, otra.slot)}>
                        <button className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 text-left hover:border-indigo-400 hover:bg-indigo-50">
                          <Miniatura ad={porSlot.get(otra.slot)} size={32} />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{otra.nombre}</span>
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              )}

              <form action={saveAdAction} className="space-y-3 p-4">
                <input type="hidden" name="slot" value={placa.slot} />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className="adm-label" htmlFor={`titulo-${placa.slot}`}>Título (opcional)</label>
                    <input id={`titulo-${placa.slot}`} name="title" defaultValue={ad?.title ?? ""} placeholder="Se muestra sobre la imagen" className="adm-field" />
                  </div>
                  <label className="inline-flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" name="enabled" defaultChecked={ad?.enabled ?? true} className="size-4 accent-indigo-600" />
                    Mostrar en la portada
                  </label>
                </div>

                <AdCropper name="image" currentUrl={ad?.imageUrl || null} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="adm-label">WhatsApp de destino</span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-500">+549</span>
                      <input name="whatsappAreaCode" defaultValue={ad?.whatsappPhone?.slice(0, 4) || ""} placeholder="3783" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" aria-label="Característica" className="adm-field w-20" />
                      <input name="whatsappNumber" defaultValue={ad?.whatsappPhone?.slice(4, 10) || ""} placeholder="123456" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" aria-label="Número" className="adm-field w-28" />
                    </div>
                  </div>
                  <div>
                    <label className="adm-label" htmlFor={`mensaje-${placa.slot}`}>Mensaje predeterminado</label>
                    <textarea id={`mensaje-${placa.slot}`} name="whatsappMessage" defaultValue={ad?.whatsappMessage || ""} rows={2} placeholder="Hola, vi su publicidad en ServiRed…" className="adm-field resize-none" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="adm-btn">Guardar placa</button>
                </div>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Un paso a la izquierda o a la derecha en la lista. Los slots van bindeados:
    un `<button name value>` no llega en el build de producción con React 19. */
function MoverBoton({ desde, hasta, etiqueta, titulo }: { desde: string; hasta: string | undefined; etiqueta: string; titulo: string }) {
  if (!hasta) return <button type="button" disabled title={titulo} className="adm-btn adm-btn-ghost adm-btn-sm">{etiqueta}</button>;
  return (
    <form action={swapAdsAction.bind(null, desde, hasta)}>
      <button title={titulo} aria-label={titulo} className="adm-btn adm-btn-ghost adm-btn-sm">{etiqueta}</button>
    </form>
  );
}
