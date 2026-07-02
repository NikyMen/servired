"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryItem, ProCard } from "@/lib/types";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { SearchIcon, MapPinIcon, GridIcon } from "@/components/icons";

export function BuscarClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [categorias, setCategorias] = useState<CategoryItem[]>([]);
  const [pros, setPros] = useState<ProCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [ubicacion, setUbicacion] = useState(params.get("ubicacion") ?? "");
  const [categoria, setCategoria] = useState(params.get("categoria") ?? "");
  const [orden, setOrden] = useState(params.get("orden") ?? "relevancia");

  // Cargar categorías una vez
  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (ubicacion) sp.set("ubicacion", ubicacion);
    if (categoria) sp.set("categoria", categoria);
    if (orden && orden !== "relevancia") sp.set("orden", orden);
    return sp.toString();
  }, [q, ubicacion, categoria, orden]);

  // Buscar profesionales (con pequeño debounce para inputs de texto)
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/profesionales?${queryString}`)
        .then((r) => r.json())
        .then((data) => setPros(data))
        .catch(() => setPros([]))
        .finally(() => setLoading(false));

      // Reflejar filtros en la URL (sin recargar)
      router.replace(queryString ? `/buscar?${queryString}` : "/buscar", { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [queryString, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Explorar servicios</h1>
        <p className="mt-1 text-slate-500">
          Encontrá profesionales verificados cerca tuyo.
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3">
          <SearchIcon className="text-slate-400" width={18} height={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="¿Qué servicio necesitás?"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 md:w-56">
          <MapPinIcon className="text-slate-400" width={18} height={18} />
          <input
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Ubicación"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
        >
          <option value="relevancia">Más relevantes</option>
          <option value="calificacion">Mejor calificados</option>
          <option value="opiniones">Más opiniones</option>
          <option value="precio">Menor precio</option>
        </select>
      </div>

      {/* Chips de categorías */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoria("")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            !categoria
              ? "border-brand-blue bg-brand-blue text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          <GridIcon width={16} height={16} /> Todos
        </button>
        {categorias.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCategoria(c.slug)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              categoria === c.slug
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <span>{c.icon}</span> {c.name}
          </button>
        ))}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : pros.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-navy-900">Sin resultados</p>
          <p className="mt-1 text-slate-500">
            Probá con otra categoría, ubicación o término de búsqueda.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {pros.length} {pros.length === 1 ? "profesional encontrado" : "profesionales encontrados"}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pros.map((pro) => (
              <ProfessionalCard key={pro.id} pro={pro} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
