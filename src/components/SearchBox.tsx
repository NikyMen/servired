"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon, MapPinIcon } from "@/components/icons";
import type { Suggestion } from "@/lib/search";

/** Espera a que dejes de tipear antes de pedir sugerencias. */
const DEBOUNCE_MS = 220;

export function SearchBox({
  defaultQuery = "",
  defaultZone = "",
  categoria,
}: {
  defaultQuery?: string;
  defaultZone?: string;
  categoria?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlighted, setHighlighted] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  // Cada búsqueda lleva número: si vuelve una respuesta vieja después de una
  // nueva, se descarta en vez de pisar las sugerencias correctas.
  const requestId = useRef(0);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }

    const id = ++requestId.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar/sugerencias?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (!res.ok || id !== requestId.current) return;
        const data = (await res.json()) as { suggestions: Suggestion[] };
        if (id === requestId.current) {
          setSuggestions(data.suggestions);
          setHighlighted(-1);
        }
      } catch {
        // Abortada o sin red: no hay nada que mostrar.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  // Cerrar al clickear afuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const visible = open && suggestions.length > 0;

  function go(s: Suggestion) {
    setOpen(false);
    router.push(s.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      // Con una sugerencia elegida gana esa; si no, el form busca el texto crudo.
      e.preventDefault();
      go(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form action="/" className="mt-5 flex flex-col gap-2 rounded-xl bg-white p-2 md:flex-row">
      <div ref={boxRef} className="relative flex flex-1 items-center gap-2 px-3">
        <SearchIcon className="shrink-0 text-slate-400" width={18} height={18} />
        <input
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Plomería, se me tapó el inodoro, electricista…"
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls="sugerencias"
          aria-autocomplete="list"
          className="w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />

        {visible && (
          <ul
            id="sugerencias"
            role="listbox"
            className="animate-fade-in absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li key={`${s.kind}-${s.label}`} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  // onMouseDown y no onClick: el blur del input cierra la lista
                  // antes de que llegue el click y el botón nunca se dispararía.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(s);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                    i === highlighted ? "bg-cliente-soft" : ""
                  }`}
                >
                  <span className="truncate text-slate-700">{s.label}</span>
                  <span className="shrink-0 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    {s.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 px-3 md:w-52 md:border-t-0 md:border-l">
        <MapPinIcon className="shrink-0 text-slate-400" width={18} height={18} />
        <input
          name="ubicacion"
          defaultValue={defaultZone}
          placeholder="Ubicación"
          autoComplete="off"
          className="w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      {categoria && <input type="hidden" name="categoria" value={categoria} />}

      <button
        type="submit"
        className="rounded-lg bg-cliente px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cliente-dark"
      >
        Buscar
      </button>
    </form>
  );
}
