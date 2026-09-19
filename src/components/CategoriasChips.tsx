"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type Chip = { key: string; href: string; label: string; active: boolean };

/** Filas que se ven de entrada; la última termina en "Ver más". */
const FILAS = 4;
/** Alto aproximado de 4 filas (chip de 38 px, 8 de separación y el py-1): hasta medir, que no salte. */
const ALTO_INICIAL = 4 * 38 + 3 * 8 + 8;

const claseChip = (active: boolean) =>
  `glass-chip shrink-0 px-3.5 py-2 text-sm font-medium whitespace-nowrap ${active ? "glass-chip-on" : "text-slate-600"}`;
const MAS = "Ver más ▾";
const MENOS = "Ver menos ▴";
const claseMas = "glass-chip shrink-0 px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-cliente-dark";

/**
 * Los chips de categorías, igual en el celular y en la compu: se ven hasta 4
 * filas y el último lugar de la cuarta es "Ver más", que despliega el resto
 * con una transición de alto.
 *
 * Cuántos entran depende del ancho, así que se mide: una copia invisible con
 * todos los chips dice en qué fila cae cada uno y dónde cabe el botón.
 */
export function CategoriasChips({ items }: { items: Chip[] }) {
  const copia = useRef<HTMLDivElement>(null);
  // null hasta medir; corte null = entran todos en 4 filas y no hace falta el botón.
  const [medida, setMedida] = useState<{ corte: number | null; cerrado: number; abierto: number } | null>(null);
  const [abierto, setAbierto] = useState(false);

  const medir = useCallback(() => {
    const caja = copia.current;
    const mas = caja?.querySelector<HTMLElement>("[data-mas]");
    const menos = caja?.querySelector<HTMLElement>("[data-menos]");
    if (!caja || !mas || !menos) return;
    const chips = Array.from(caja.querySelectorAll<HTMLElement>("[data-chip]"));
    const filasDe = () => [...new Set(chips.filter((chip) => chip.style.display !== "none").map((chip) => chip.offsetTop))].sort((a, b) => a - b);
    chips.forEach((chip) => (chip.style.display = ""));

    mas.style.display = "none";
    menos.style.display = "none";
    const filas = filasDe();
    if (filas.length <= FILAS) {
      setMedida({ corte: null, cerrado: caja.scrollHeight, abierto: caja.scrollHeight });
      return;
    }

    // Abierto: todos los chips y "Ver menos" al final.
    menos.style.display = "";
    const abiertoAlto = caja.scrollHeight;
    menos.style.display = "none";

    // Cerrado: los que entran en 4 filas, sacando del final hasta que "Ver
    // más" también quepa en la cuarta.
    mas.style.display = "";
    const ultimaFila = filas[FILAS - 1];
    let n = chips.filter((chip) => chip.offsetTop <= ultimaFila).length;
    for (; n > 1; n--) {
      chips.forEach((chip, i) => (chip.style.display = i < n ? "" : "none"));
      if (mas.offsetTop <= ultimaFila) break;
    }
    const cerradoAlto = caja.scrollHeight;
    chips.forEach((chip) => (chip.style.display = ""));
    setMedida({ corte: n, cerrado: cerradoAlto, abierto: abiertoAlto });
  }, []);

  useLayoutEffect(medir, [medir, items]);

  // Se vuelve a medir solo cuando cambia el ancho (girar el celu, achicar la ventana).
  useEffect(() => {
    const caja = copia.current;
    if (!caja || typeof ResizeObserver === "undefined") return;
    let ancho = caja.clientWidth;
    const observador = new ResizeObserver(() => {
      if (caja.clientWidth === ancho) return;
      ancho = caja.clientWidth;
      medir();
    });
    observador.observe(caja);
    return () => observador.disconnect();
  }, [medir]);

  const corte = medida?.corte ?? null;
  // Si la categoría elegida quedó en la parte escondida, arranca desplegado.
  const activa = items.findIndex((item) => item.active);
  useEffect(() => {
    if (corte != null && activa >= corte) setAbierto(true);
  }, [corte, activa]);

  const cortado = corte != null && !abierto;
  const visibles = cortado ? items.slice(0, corte) : items;
  const ocultos = cortado ? items.slice(corte) : [];
  const alto = medida ? (abierto ? medida.abierto : medida.cerrado) : ALTO_INICIAL;

  return (
    <div className="relative">
      {/* La copia para medir: mismo ancho y mismas clases, fuera de la vista y del lector. */}
      <div ref={copia} aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap gap-2 py-1">
        {items.map((item) => <span key={item.key} data-chip className={claseChip(item.active)}>{item.label}</span>)}
        <span data-mas className={claseMas}>{MAS}</span>
        <span data-menos className={claseMas}>{MENOS}</span>
      </div>

      <div
        id="categorias"
        className="flex flex-wrap content-start gap-2 overflow-hidden py-1 transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{ height: alto }}
      >
        {visibles.map((item) => (
          <Link key={item.key} href={item.href} aria-current={item.active ? "true" : undefined} className={claseChip(item.active)}>{item.label}</Link>
        ))}
        {corte != null && (
          <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-controls="categorias" className={claseMas}>
            {abierto ? MENOS : MAS}
          </button>
        )}
        {/* Los que no entran siguen en la página para los buscadores, pero fuera del foco. */}
        {ocultos.map((item) => (
          <Link key={item.key} href={item.href} tabIndex={-1} aria-hidden className={claseChip(item.active)}>{item.label}</Link>
        ))}
      </div>
    </div>
  );
}
