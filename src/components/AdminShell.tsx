"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { logoutAdminAction } from "@/app/admin/actions";

export type AdminSeccion = {
  tab: string;
  nombre: string;
  /** Lo que se explica arriba del contenido. */
  titulo: string;
  descripcion: string;
  /** Emoji del menú: sin dependencias y se distingue de un vistazo. */
  icono: string;
  grupo: "Panel" | "Revisión" | "Comunidad" | "Portada" | "Sitio";
  /** Cuántas cosas esperan una decisión; 0 no muestra nada. */
  pendientes?: number;
};

/**
 * Armazón del panel: menú lateral fijo en la compu, cajón en el celular, y
 * una cabecera que dice dónde estás. El estado de "abierto" es lo único que
 * hace falta de cliente; todo el contenido llega ya renderizado del servidor.
 */
export function AdminShell({
  secciones,
  activa,
  children,
}: {
  secciones: AdminSeccion[];
  activa: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = secciones.find((s) => s.tab === activa) ?? secciones[0];
  const pendientesTotal = secciones.reduce((total, s) => total + (s.pendientes ?? 0), 0);

  // Al navegar, el cajón se cierra solo: la sección nueva llega por URL.
  useEffect(() => { setAbierto(false); }, [activa]);

  // Con el cajón abierto no se scrollea lo de atrás.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  const grupos = ["Panel", "Revisión", "Comunidad", "Portada", "Sitio"] as const;

  const menu = (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <LogoMark size={30} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">ServiRed</p>
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Administración</p>
        </div>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar el menú" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden">✕</button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {grupos.map((grupo) => {
          const items = secciones.filter((s) => s.grupo === grupo);
          if (!items.length) return null;
          return (
            <div key={grupo}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{grupo}</p>
              <ul className="space-y-0.5">
                {items.map((s) => (
                  <li key={s.tab}>
                    <Link href={s.tab === "resumen" ? "/admin" : `/admin?tab=${s.tab}`} aria-current={s.tab === activa ? "page" : undefined} className="adm-nav-item">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span aria-hidden className="w-4 text-center text-sm">{s.icono}</span>
                        <span className="truncate">{s.nombre}</span>
                      </span>
                      {s.pendientes ? <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900">{s.pendientes}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link href="/" className="adm-nav-item mb-1">
          <span className="flex items-center gap-2.5"><span aria-hidden className="w-4 text-center text-sm">↗</span>Ver el sitio</span>
        </Link>
        <form action={logoutAdminAction}>
          <button className="adm-nav-item w-full text-left">
            <span className="flex items-center gap-2.5"><span aria-hidden className="w-4 text-center text-sm">⎋</span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div data-admin className="adm min-h-screen lg:pl-64">
      {/* Compu: el menú queda fijo y nunca se va de la pantalla. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{menu}</aside>

      {/* Celular: el mismo menú, como cajón. */}
      {abierto && (
        <>
          <button type="button" aria-label="Cerrar el menú" onClick={() => setAbierto(false)} className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl lg:hidden">{menu}</aside>
        </>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir el menú" className="adm-btn adm-btn-ghost adm-btn-sm lg:hidden">☰</button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{actual.titulo}</h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">{actual.descripcion}</p>
            </div>
            {pendientesTotal > 0 && (
              <span className="adm-badge adm-badge-warn hidden sm:inline-flex">{pendientesTotal} pendiente{pendientesTotal === 1 ? "" : "s"}</span>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-6xl space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
