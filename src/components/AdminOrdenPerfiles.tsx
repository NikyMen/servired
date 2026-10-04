"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarOrdenPerfilesAction } from "@/app/admin/actions";
import { Avatar } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { mismoOrden, ubicarPerfil } from "@/lib/orden-perfiles-utils";

type Fila = {
  id: string;
  name: string;
  avatarUrl: string | null;
  businessName: string | null;
  headline: string;
  providerType: string;
  posicionFija: number | null;
  approvedAt: Date | null;
  createdAt: Date;
  oculto: boolean;
};
type Destino = { zona: "fijados"; id?: string; despues?: boolean } | { zona: "automaticos" };
type Arrastre = { id: string; pointerId: number; inicioX: number; inicioY: number; x: number; y: number; activo: boolean; destino: Destino | null };
type Aviso = { tipo: "ok" | "error" | "info"; texto: string };

function destinoEn(x: number, y: number, origen: string): Destino | null {
  const elemento = document.elementFromPoint(x, y);
  const zona = elemento?.closest<HTMLElement>("[data-profile-zone]")?.dataset.profileZone;
  if (zona === "automaticos") return { zona };
  if (zona !== "fijados") return null;
  const fila = elemento?.closest<HTMLElement>("[data-profile-id]");
  if (!fila) return { zona: "fijados" };
  if (fila.dataset.profileId === origen) return null;
  const rect = fila.getBoundingClientRect();
  return { zona: "fijados", id: fila.dataset.profileId, despues: y > rect.top + rect.height / 2 };
}

export function AdminOrdenPerfiles({ rows }: { rows: Fila[] }) {
  const router = useRouter();
  const delServidor = useMemo(() => rows.filter((row) => row.posicionFija !== null).map((row) => row.id), [rows]);
  const firmaServidor = JSON.stringify(delServidor);
  const ultimaFirma = useRef(firmaServidor);
  const [guardado, setGuardado] = useState(delServidor);
  const [orden, setOrden] = useState(delServidor);
  const [historial, setHistorial] = useState<string[][]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [arrastrando, setArrastrando] = useState<Arrastre | null>(null);
  const arrastreRef = useRef<Arrastre | null>(null);
  const guardandoRef = useRef(false);
  const cambiado = !mismoOrden(orden, guardado);
  const bloqueado = guardando || !!arrastrando;
  const porId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const fijados = orden.map((id) => porId.get(id)).filter((row): row is Fila => !!row);
  const automaticos = rows.filter((row) => !orden.includes(row.id)).sort((a, b) =>
    (b.approvedAt ?? b.createdAt).getTime() - (a.approvedAt ?? a.createdAt).getTime() || a.id.localeCompare(b.id));
  const normalizar = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const consulta = normalizar(busqueda.trim());
  const coincide = (row: Fila) => normalizar(`${row.name} ${row.businessName ?? ""} ${row.headline}`).includes(consulta);

  // Un refresh no pisa un borrador ni revierte un guardado cuya respuesta
  // llegó antes que los props nuevos. Descartar toma la última lista recibida.
  useEffect(() => {
    if (guardando || ultimaFirma.current === firmaServidor) return;
    ultimaFirma.current = firmaServidor;
    if (mismoOrden(orden, guardado)) {
      setGuardado(delServidor);
      setOrden(delServidor);
      setHistorial([]);
    }
  }, [delServidor, firmaServidor, guardado, orden, guardando]);

  useEffect(() => {
    if (!cambiado) return;
    const antesDeSalir = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", antesDeSalir);
    return () => window.removeEventListener("beforeunload", antesDeSalir);
  }, [cambiado]);

  const arrastrandoId = arrastrando?.id;
  useEffect(() => {
    if (!arrastrandoId) return;
    const cursor = document.body.style.cursor;
    const seleccion = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    const cancelar = () => { arrastreRef.current = null; setArrastrando(null); };
    const teclado = (event: KeyboardEvent) => { if (event.key === "Escape") cancelar(); };
    window.addEventListener("blur", cancelar);
    window.addEventListener("keydown", teclado);
    let frame: number;
    const desplazar = () => {
      const actual = arrastreRef.current;
      if (!actual) return;
      const lista = document.elementFromPoint(actual.x, actual.y)?.closest<HTMLElement>("[data-profile-scroll]");
      let desplazado = false;
      if (lista && lista.scrollHeight > lista.clientHeight) {
        const rect = lista.getBoundingClientRect();
        const paso = actual.y < rect.top + 48 ? -12 : actual.y > rect.bottom - 48 ? 12 : 0;
        const previo = lista.scrollTop;
        lista.scrollTop += paso;
        desplazado = previo !== lista.scrollTop;
      }
      if (!desplazado) {
        const paso = actual.y < 100 ? -12 : actual.y > innerHeight - 64 ? 12 : 0;
        const previo = window.scrollY;
        window.scrollBy(0, paso);
        desplazado = previo !== window.scrollY;
      }
      if (desplazado) {
        actual.destino = destinoEn(actual.x, actual.y, actual.id);
        setArrastrando({ ...actual });
      }
      frame = requestAnimationFrame(desplazar);
    };
    frame = requestAnimationFrame(desplazar);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.cursor = cursor;
      document.body.style.userSelect = seleccion;
      window.removeEventListener("blur", cancelar);
      window.removeEventListener("keydown", teclado);
    };
  }, [arrastrandoId]);

  function cambiar(siguiente: string[], texto: string) {
    if (guardandoRef.current || mismoOrden(siguiente, orden)) return;
    setHistorial((previo) => [...previo.slice(-19), orden]);
    setOrden(siguiente);
    setAviso({ tipo: "info", texto });
  }

  function ubicar(row: Fila, posicion: number | null) {
    const siguiente = ubicarPerfil(orden, row.id, posicion);
    const nombre = row.businessName || row.name;
    cambiar(siguiente, posicion === null ? `${nombre} vuelve al orden automático.` : `${nombre} queda en la posición ${siguiente.indexOf(row.id) + 1}.`);
  }

  function comenzar(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (bloqueado || event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    arrastreRef.current = { id, pointerId: event.pointerId, inicioX: event.clientX, inicioY: event.clientY, x: event.clientX, y: event.clientY, activo: false, destino: null };
  }

  function arrastrar(event: PointerEvent<HTMLButtonElement>) {
    const actual = arrastreRef.current;
    if (!actual || actual.pointerId !== event.pointerId) return;
    actual.x = event.clientX;
    actual.y = event.clientY;
    actual.activo ||= Math.hypot(actual.x - actual.inicioX, actual.y - actual.inicioY) > 6;
    if (!actual.activo) return;
    actual.destino = destinoEn(actual.x, actual.y, actual.id);
    setArrastrando({ ...actual });
  }

  function terminar(event: PointerEvent<HTMLButtonElement>) {
    const actual = arrastreRef.current;
    if (!actual || actual.pointerId !== event.pointerId) return;
    arrastreRef.current = null;
    setArrastrando(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const row = porId.get(actual.id);
    if (!actual.activo || !actual.destino || !row) return;
    if (actual.destino.zona === "automaticos") ubicar(row, null);
    else {
      const restantes = orden.filter((id) => id !== actual.id);
      const indice = actual.destino.id ? restantes.indexOf(actual.destino.id) : restantes.length;
      ubicar(row, indice < 0 ? restantes.length : indice + (actual.destino.id && actual.destino.despues ? 1 : 0));
    }
  }

  async function guardar() {
    if (guardandoRef.current || !cambiado || arrastreRef.current) return;
    if (!navigator.onLine) { setAviso({ tipo: "error", texto: "Estás sin conexión. Tus cambios siguen acá; guardalos cuando vuelva internet." }); return; }
    guardandoRef.current = true;
    setGuardando(true);
    setAviso(null);
    try {
      const resultado = await guardarOrdenPerfilesAction({ ids: orden, anteriores: guardado });
      if (resultado.ok) {
        setGuardado(resultado.ids);
        setOrden(resultado.ids);
        setHistorial([]);
        setAviso({ tipo: "ok", texto: "Orden guardado. La portada y el mapa ya usan esta prioridad." });
      } else setAviso({ tipo: "error", texto: resultado.error });
      router.refresh();
    } catch {
      setAviso({ tipo: "error", texto: "No pudimos guardar. Tus cambios siguen acá; intentá nuevamente." });
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  function descartar() {
    setOrden(delServidor);
    setGuardado(delServidor);
    setHistorial([]);
    setAviso({ tipo: "info", texto: "Cambios descartados. Estás viendo el orden guardado." });
  }

  function fila(row: Fila, zona: "fijados" | "automaticos") {
    const index = orden.indexOf(row.id);
    const nombre = row.businessName || row.name;
    const destino = arrastrando?.destino;
    const marcado = destino?.zona === "fijados" && destino.id === row.id;
    const claseLinea = "pointer-events-none absolute inset-x-3 z-10 h-1 rounded-full bg-cliente shadow-sm";
    return (
      <li key={row.id} data-profile-id={row.id} className={`relative border-b border-slate-100 bg-white p-3 transition-colors last:border-b-0 ${arrastrando?.id === row.id ? "opacity-40" : "hover:bg-slate-50"}`}>
        {marcado && <span aria-hidden="true" className={`${claseLinea} ${destino.despues ? "-bottom-0.5" : "-top-0.5"}`} />}
        <div className="flex items-center gap-3">
          <button
            type="button" disabled={guardando}
            aria-label={`Arrastrar ${nombre}. Flechas arriba y abajo para cambiar su posición.`}
            aria-describedby="orden-instrucciones"
            title="Arrastrar para mover · También podés usar las flechas del teclado"
            className="inline-flex min-h-11 min-w-11 touch-none cursor-grab items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-400 hover:border-cliente hover:text-cliente active:cursor-grabbing disabled:opacity-40"
            onPointerDown={(event) => comenzar(event, row.id)} onPointerMove={arrastrar} onPointerUp={terminar}
            onPointerCancel={() => { arrastreRef.current = null; setArrastrando(null); }}
            onLostPointerCapture={() => { arrastreRef.current = null; setArrastrando(null); }}
            onKeyDown={(event) => {
              if (bloqueado || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              ubicar(row, event.key === "Home" ? 0 : event.key === "End" ? orden.length : index < 0 ? orden.length : index + (event.key === "ArrowUp" ? -1 : 1));
              requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-profile-id="${CSS.escape(row.id)}"] button`)?.focus({ preventScroll: true }));
            }}
          ><span aria-hidden="true">⠿</span></button>
          <Avatar name={row.name} src={row.avatarUrl} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex min-w-7 justify-center rounded-lg px-1.5 py-1 text-xs font-bold ${index >= 0 ? "bg-blue-50 text-cliente" : "bg-slate-100 text-slate-500"}`}>{index >= 0 ? `#${index + 1}` : "Auto"}</span>
              <Link href={`/profesionales/${row.id}`} target="_blank" rel="noopener noreferrer" className="break-words text-sm font-semibold text-slate-900 hover:underline">{nombre}</Link>
            </div>
            <p className="mt-1 break-words text-xs text-slate-500">{row.headline} · {row.providerType === "profesional" ? "Profesional" : "Oficio"}</p>
            {row.oculto && <span className="adm-badge adm-badge-warn mt-1">No se ve en el sitio</span>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {zona === "fijados" ? (
            <>
              <button type="button" disabled={bloqueado || index === 0} onClick={() => ubicar(row, index - 1)} aria-label={`Subir ${nombre} un lugar`} title="Subir un lugar" className="adm-btn adm-btn-ghost min-h-11 min-w-11 disabled:opacity-40">↑</button>
              <button type="button" disabled={bloqueado || index === orden.length - 1} onClick={() => ubicar(row, index + 1)} aria-label={`Bajar ${nombre} un lugar`} title="Bajar un lugar" className="adm-btn adm-btn-ghost min-h-11 min-w-11 disabled:opacity-40">↓</button>
              <form className="flex items-center gap-1" onSubmit={(event) => {
                event.preventDefault();
                const posicion = Number(new FormData(event.currentTarget).get("posicion"));
                if (!bloqueado && Number.isInteger(posicion) && posicion >= 1 && posicion <= orden.length) ubicar(row, posicion - 1);
              }}>
                <input key={index} name="posicion" aria-label={`Posición de ${nombre}`} type="number" inputMode="numeric" min={1} max={orden.length} defaultValue={index + 1} disabled={bloqueado} className="adm-field min-h-11 w-16 px-2 text-center" />
                <button disabled={bloqueado} type="submit" className="adm-btn adm-btn-ghost min-h-11" aria-label={`Mover ${nombre} a la posición indicada`}>Ir</button>
              </form>
              <button type="button" disabled={bloqueado} onClick={() => ubicar(row, null)} className="adm-btn adm-btn-ghost min-h-11 text-xs">Automático</button>
            </>
          ) : (
            <>
              <p className="mr-auto text-[11px] text-slate-400">Aceptado {formatDate(row.approvedAt ?? row.createdAt)}</p>
              <button type="button" disabled={bloqueado} onClick={() => ubicar(row, 0)} className="adm-btn adm-btn-ghost min-h-11 text-xs">Poner primero</button>
              <button type="button" disabled={bloqueado} onClick={() => ubicar(row, orden.length)} className="adm-btn min-h-11 text-xs">Fijar</button>
            </>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <div className="adm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Elegí quién aparece primero</h3>
            <p id="orden-instrucciones" className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Arrastrá desde el asa ⠿ para ordenar o pasar perfiles entre las listas. También podés usar las flechas o indicar una posición. Guardá para publicar los cambios.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="adm-badge">{rows.length} perfiles</span><span className="adm-badge adm-badge-ok">{fijados.length} fijados</span><span className="adm-badge">{automaticos.length} automáticos</span></div>
        </div>
        <label className="mt-4 block">
          <span className="sr-only">Buscar perfiles por nombre, negocio o actividad</span>
          <input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre, negocio o actividad…" className="adm-field w-full px-3 py-3 sm:max-w-md" />
        </label>
      </div>

      <div className="adm-card sticky top-20 z-10 flex flex-wrap items-center justify-between gap-3 border-cliente/20 p-3 shadow-sm">
        <p className={`text-sm font-semibold ${cambiado ? "text-amber-700" : "text-slate-500"}`} aria-live="polite">{guardando ? "Guardando orden…" : cambiado ? "Cambios sin guardar" : "Orden guardado"}</p>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          <button type="button" disabled={bloqueado || !historial.length} onClick={() => { setOrden(historial[historial.length - 1]); setHistorial(historial.slice(0, -1)); setAviso({ tipo: "info", texto: "Último movimiento deshecho." }); }} className="adm-btn adm-btn-ghost min-h-11 px-3 text-xs disabled:opacity-40">Deshacer</button>
          <button type="button" aria-label="Descartar cambios" disabled={bloqueado || (!cambiado && mismoOrden(guardado, delServidor))} onClick={descartar} className="adm-btn adm-btn-ghost min-h-11 px-3 text-xs disabled:opacity-40">Descartar</button>
          <button type="button" disabled={bloqueado || !cambiado} onClick={guardar} className="adm-btn min-h-11 px-3 text-xs disabled:opacity-40">{guardando ? "Guardando…" : "Guardar orden"}</button>
        </div>
      </div>

      {aviso && <p role={aviso.tipo === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${aviso.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : aviso.tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{aviso.texto}</p>}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {(["fijados", "automaticos"] as const).map((zona) => {
          const lista = zona === "fijados" ? fijados : automaticos;
          const visibles = lista.filter(coincide);
          const activo = arrastrando?.destino?.zona === zona;
          return (
            <section key={zona} data-profile-zone={zona} aria-labelledby={`orden-${zona}`} className={`adm-card overflow-hidden transition-shadow ${activo ? "ring-2 ring-cliente" : ""}`}>
              <header className="border-b border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id={`orden-${zona}`} className="font-bold text-slate-900">{zona === "fijados" ? "📌 Prioridad manual" : "↻ Orden automático"} <span className="text-sm font-normal text-slate-400">({lista.length})</span></h3>
                  {zona === "fijados" && <button type="button" disabled={bloqueado || !orden.length} onClick={() => cambiar([], "Todos los perfiles vuelven al orden automático. Podés deshacer este cambio.")} className="min-h-11 text-xs font-medium text-slate-500 underline underline-offset-2 disabled:opacity-40">Volver todos a automático</button>}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{zona === "fijados" ? "Aparecen antes que los demás. El número indica su prioridad." : "Los aceptados más recientemente aparecen primero. Arrastrá uno a Prioridad manual para fijarlo."}</p>
              </header>
              <div data-profile-scroll="true" className="max-h-[65vh] min-h-24 overflow-y-auto overscroll-contain">
                <ol>{visibles.map((row) => fila(row, zona))}</ol>
                {!visibles.length && <p className="px-4 py-8 text-center text-sm text-slate-500">{consulta ? "No hay coincidencias con esta búsqueda." : zona === "fijados" ? "Arrastrá acá el primer perfil que quieras destacar." : "Todos los perfiles tienen una prioridad manual."}</p>}
                <div className={`m-3 rounded-xl border-2 border-dashed px-4 py-5 text-center text-xs transition-colors ${activo ? "border-cliente bg-blue-50 text-cliente" : "border-slate-200 text-slate-400"}`}>
                  {zona === "fijados" ? "Soltá acá para fijar al final de la lista" : "Soltá acá para volver al orden automático"}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-slate-500">La prioridad se aplica a la portada y al mapa cuando no hay texto buscado. Las búsquedas siguen ordenándose por relevancia. Fijar un perfil oculto no lo publica.</p>
      {arrastrando && <div aria-hidden="true" className="pointer-events-none fixed z-50 max-w-[260px] rounded-xl border border-cliente bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl" style={{ left: Math.max(8, Math.min(arrastrando.x + 16, innerWidth - 268)), top: Math.max(8, Math.min(arrastrando.y + 16, innerHeight - 72)) }}>⠿ {porId.get(arrastrando.id)?.businessName || porId.get(arrastrando.id)?.name}<p className="mt-1 text-xs font-normal text-cliente">{arrastrando.destino?.zona === "automaticos" ? "Volver al orden automático" : arrastrando.destino ? "Soltar para fijar en esta posición" : "Elegí dónde ubicarlo"}</p></div>}
    </div>
  );
}
