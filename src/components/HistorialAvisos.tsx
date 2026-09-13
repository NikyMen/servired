"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ICONOS_AVISO } from "@/components/Campanita";
import { TrashIcon } from "@/components/icons";
import { useNoLeidos, type Aviso } from "@/components/NoLeidos";

function tituloDia(fecha: string) {
  const d = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === hoy.getFullYear() ? undefined : "numeric" });
}

/** El historial completo de la campanita, de a veinte, con filtro y borrado. */
export function HistorialAvisos() {
  const { borrarAvisos, marcarAvisosLeidos, avisosSinLeer } = useNoLeidos();
  const [filtro, setFiltro] = useState<"todas" | "sinLeer">("todas");
  const [items, setItems] = useState<Aviso[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (desde: string | null) => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (desde) params.set("cursor", desde);
      if (filtro === "sinLeer") params.set("sinLeer", "1");
      const res = await fetch(`/api/avisos?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setError(data?.error ?? "No pudimos cargar tus notificaciones.");
      setItems((prev) => (desde && prev ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
    } catch {
      setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    setItems(null);
    void cargar(null);
  }, [cargar]);

  // Entrar al historial es verlo: se marcan leídas después de mostrarlas
  // resaltadas una vez.
  useEffect(() => {
    if (items && avisosSinLeer > 0) void marcarAvisosLeidos();
  }, [items, avisosSinLeer, marcarAvisosLeidos]);

  async function borrar(id?: string) {
    if (!id && !window.confirm("¿Borrar todas las notificaciones? No se puede deshacer.")) return;
    setItems((prev) => (id ? (prev ?? []).filter((aviso) => aviso.id !== id) : []));
    if (!id) setCursor(null);
    await borrarAvisos(id);
  }

  const grupos: { dia: string; avisos: Aviso[] }[] = [];
  for (const aviso of items ?? []) {
    const dia = tituloDia(aviso.createdAt);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.avisos.push(aviso);
    else grupos.push({ dia, avisos: [aviso] });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="glass glass-thin inline-flex rounded-xl p-1 text-sm">
          {(["todas", "sinLeer"] as const).map((valor) => (
            <button
              key={valor}
              role="tab"
              aria-selected={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${filtro === valor ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {valor === "todas" ? "Todas" : "Sin leer"}
            </button>
          ))}
        </div>
        {items && items.length > 0 && (
          <button type="button" onClick={() => void borrar()} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600">
            <TrashIcon width={15} height={15} />
            Borrar todas
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">{error}</p>}

      {items === null ? (
        <p className="glass glass-solid rounded-2xl p-8 text-center text-sm text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="glass glass-solid rounded-2xl p-10 text-center">
          <p className="text-3xl" aria-hidden>🔔</p>
          <p className="mt-2 font-semibold text-slate-900">{filtro === "sinLeer" ? "Estás al día" : "No tenés notificaciones"}</p>
          <p className="mt-1 text-sm text-slate-500">Cuando pase algo con tus mensajes, propuestas o solicitudes, lo vas a ver acá.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <div key={grupo.dia}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">{grupo.dia}</h2>
              <ul className="glass glass-solid divide-y divide-white/60 overflow-hidden rounded-2xl">
                {grupo.avisos.map((aviso) => (
                  <li key={aviso.id} className={`group relative ${aviso.readAt ? "" : "bg-[rgb(var(--accent-rgb)/0.07)]"}`}>
                    <Link href={aviso.url} className="flex gap-3 py-3.5 pr-12 pl-4 transition-colors hover:bg-white/60">
                      <span aria-hidden className="text-xl leading-none">{ICONOS_AVISO[aviso.kind] ?? "🔔"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{aviso.title}</span>
                          {!aviso.readAt && <span className="size-2 shrink-0 rounded-full bg-red-500" aria-label="Sin leer" />}
                        </span>
                        {aviso.body && <span className="mt-0.5 block break-words text-sm text-slate-600">{aviso.body}</span>}
                        <span className="mt-1 block text-xs text-slate-400">{new Date(aviso.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void borrar(aviso.id)}
                      aria-label={`Borrar: ${aviso.title}`}
                      title="Borrar"
                      className="absolute top-3 right-3 rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {cursor && (
            <button type="button" disabled={cargando} onClick={() => void cargar(cursor)} className="glass-btn glass-btn-ghost w-full px-4 py-2.5 text-sm disabled:opacity-50">
              {cargando ? "Cargando…" : "Cargar más"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
