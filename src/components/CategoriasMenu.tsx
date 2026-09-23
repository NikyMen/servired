"use client";

import { useState } from "react";
import { CategoriasChips } from "@/components/CategoriasChips";
import { EnlaceSuave, useNavegacionSuave } from "@/components/NavegacionSuave";

type Opcion = { key: string; href: string; label: string; active: boolean };
export type CategoriaPrincipal = Opcion & { name: string; subcategorias: Opcion[] };

const claseSub = (active: boolean) =>
  `glass-chip inline-flex shrink-0 px-3.5 py-2 text-sm font-medium whitespace-nowrap ${active ? "glass-chip-on" : "text-slate-600"}`;

/**
 * Categorías de la portada como menú: tocar una no navega, despliega abajo sus
 * subcategorías (con una transición de alto) y recién elegir una filtra los
 * resultados, sin recargar ni mover la página. Tocar la categoría abierta la
 * pliega. La que coincide con el filtro de la URL arranca abierta.
 */
export function CategoriasMenu({ todos, principales }: { todos: Opcion; principales: CategoriaPrincipal[] }) {
  const { navegar } = useNavegacionSuave();
  const [abierta, setAbierta] = useState<string | null>(principales.find((p) => p.active)?.key ?? null);
  // La última abierta sigue dibujada mientras el panel se pliega, así no se vacía de golpe.
  const [mostrada, setMostrada] = useState<string | null>(abierta);
  const actual = principales.find((p) => p.key === (abierta ?? mostrada));
  // Si cambia el filtro de tipo, la abierta puede dejar de estar en la lista.
  const desplegado = Boolean(abierta && principales.some((p) => p.key === abierta));
  const soloPrincipal = Boolean(actual?.active && actual.subcategorias.every((s) => !s.active));

  function alternar(key: string) {
    const siguiente = abierta === key ? null : key;
    setAbierta(siguiente);
    if (siguiente) setMostrada(siguiente);
  }

  const menu = ({ primero, ultimo }: { primero: boolean; ultimo: boolean }) => actual && (
    // A lo ancho de la lista, justo debajo de la fila de su categoría. El
    // margen se come el espacio entre filas y 1 px más, que queda debajo de la
    // pestaña; plegado mide 0 y la fila siguiente queda (casi) donde estaba.
    <div
      className={`-mt-[9px] grid basis-full transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${desplegado ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      onTransitionEnd={() => !desplegado && setMostrada(null)}
      inert={!desplegado}
    >
      <div className="min-h-0 overflow-hidden">
        <div key={actual.key} className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${primero ? "rounded-tl-none" : ""} ${ultimo ? "rounded-tr-none" : ""}`}>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Subcategorías de {actual.name}</p>
          <div className="flex flex-wrap gap-2">
            <EnlaceSuave href={actual.href} aria-current={soloPrincipal ? "true" : undefined} className={claseSub(soloPrincipal)}>
              Todo {actual.name}
            </EnlaceSuave>
            {actual.subcategorias.map((sub) => (
              <EnlaceSuave key={sub.key} href={sub.href} aria-current={sub.active ? "true" : undefined} className={claseSub(sub.active)}>
                {sub.label}
              </EnlaceSuave>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <CategoriasChips
      panel={actual ? { key: actual.key, render: menu } : null}
      items={[
        { ...todos, onSelect: () => { setAbierta(null); navegar(todos.href); } },
        ...principales.map((p) => ({ key: p.key, href: p.href, label: p.label, active: p.active || abierta === p.key, expanded: abierta === p.key, pestana: desplegado && abierta === p.key, onSelect: () => alternar(p.key) })),
      ]}
    />
  );
}
