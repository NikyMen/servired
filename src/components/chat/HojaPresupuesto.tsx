"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";
import { TarjetaPresupuesto } from "@/components/chat/TarjetaPresupuesto";
import { PROPOSAL_TTL_LABEL, PROPOSAL_TTL_MS } from "@/lib/trabajo";
import { DIAS_RAPIDOS, ars, montoConMiles, montoDesdeTexto, presupuestoValido } from "@/lib/presupuesto";

type Borrador = { monto: string; dias: number | null; otro: boolean; detalle: string };
const VACIO: Borrador = { monto: "", dias: null, otro: false, detalle: "" };
const clave = (conversationId: string) => `presupuesto:${conversationId}`;

// sessionStorage puede tirar (modo privado, bloqueado): el borrador es una
// comodidad, nunca algo de lo que dependa mandar el presupuesto.
function leerBorrador(conversationId: string): Borrador {
  try {
    const crudo = window.sessionStorage.getItem(clave(conversationId));
    return crudo ? { ...VACIO, ...JSON.parse(crudo) } : VACIO;
  } catch {
    return VACIO;
  }
}
function guardarBorrador(conversationId: string, borrador: Borrador | null) {
  try {
    if (borrador) window.sessionStorage.setItem(clave(conversationId), JSON.stringify(borrador));
    else window.sessionStorage.removeItem(clave(conversationId));
  } catch {
    // Sin almacenamiento: se pierde el borrador al cerrar, nada más.
  }
}

/**
 * En iOS el teclado no achica la ventana: tapa lo de abajo. Atar el alto de la
 * hoja al `visualViewport` deja el botón de enviar siempre arriba del teclado.
 */
function useAreaVisible(activo: boolean) {
  const [area, setArea] = useState<{ alto: number; arriba: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!activo || !vv) return;
    const medir = () => setArea({ alto: vv.height, arriba: vv.offsetTop });
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, [activo]);
  return area;
}

function useEsCelu() {
  const [celu, setCelu] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const aplicar = () => setCelu(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);
  return celu;
}

/**
 * El formulario del presupuesto. Pantalla completa en el celu y ventana en la
 * compu. Es uno solo para el primero y para los siguientes: sin acuerdo abierto
 * crea uno; con uno pedido (rechazado o vencido el anterior) le suma otro.
 */
export function HojaPresupuesto({ conversationId, bookingId, para, onCerrar, onEnviado }: {
  conversationId: string;
  /** El acuerdo abierto en estado "requested", si lo hay. */
  bookingId: string | null;
  /** Nombre del cliente, para la vista previa. */
  para: string;
  onCerrar: () => void;
  onEnviado: () => Promise<void>;
}) {
  const [b, setB] = useState<Borrador>(VACIO);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monto = useRef<HTMLInputElement>(null);
  const celu = useEsCelu();
  const area = useAreaVisible(celu);

  useEffect(() => {
    setB(leerBorrador(conversationId));
    monto.current?.focus({ preventScroll: true });
  }, [conversationId]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && !ocupado && onCerrar();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [ocupado, onCerrar]);

  function cambiar(parcial: Partial<Borrador>) {
    setB((prev) => {
      const next = { ...prev, ...parcial };
      guardarBorrador(conversationId, next);
      return next;
    });
  }

  const valor = montoDesdeTexto(b.monto);
  const ok = presupuestoValido(valor, b.dias);
  const falta = !valor ? "Completá el monto" : valor < 100 ? "El monto mínimo es $100" : !b.dias ? "Elegí en cuántos días" : b.dias > 365 ? "Hasta 365 días" : "";

  async function enviar() {
    if (!ok || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const response = bookingId
        ? await fetch(`/api/contrataciones/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_proposal", amount: valor, message: b.detalle.trim(), estimatedDays: b.dias }) })
        : await fetch(`/api/conversaciones/${conversationId}/acuerdo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "propose", amount: valor, detail: b.detalle.trim(), estimatedDays: b.dias }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No pudimos enviar el presupuesto. Probá de nuevo.");
        setOcupado(false);
        return;
      }
      guardarBorrador(conversationId, null);
      await onEnviado();
    } catch {
      setError("No hay conexión. Lo que cargaste sigue acá: probá de nuevo.");
      setOcupado(false);
    }
  }

  if (typeof document === "undefined") return null;
  const vistaPrevia = { id: "vista-previa", amount: valor, status: "pending", expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS).toISOString(), estimatedDays: b.dias, message: b.detalle.trim() || null };
  const estiloCelu = celu && area ? { height: area.alto, top: area.arriba } : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-950/35 md:flex md:items-center md:justify-center md:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !ocupado) onCerrar(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-presupuesto-titulo"
        style={estiloCelu}
        className="animate-sheet-up fixed inset-x-0 top-0 flex h-[100dvh] flex-col bg-white md:static md:h-auto md:max-h-[90dvh] md:w-full md:max-w-lg md:rounded-3xl md:shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-2 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] md:px-4 md:pt-3">
          <button type="button" onClick={onCerrar} disabled={ocupado} aria-label="Cerrar" className="grid size-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <XIcon width={22} height={22} />
          </button>
          <h2 id="hoja-presupuesto-titulo" className="flex-1 text-base font-bold text-slate-900">Nuevo presupuesto</h2>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="space-y-1.5">
            <label htmlFor="presupuesto-monto" className="text-sm font-semibold text-slate-900">¿Cuánto cobrás?</label>
            <div className="flex h-14 items-center rounded-2xl border-[1.5px] border-slate-300 bg-white px-4 focus-within:border-pro focus-within:ring-4 focus-within:ring-emerald-600/15">
              <span className="mr-1.5 text-2xl font-semibold text-slate-400">$</span>
              <input
                ref={monto}
                id="presupuesto-monto"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="next"
                placeholder="0"
                value={b.monto}
                onChange={(event) => cambiar({ monto: montoConMiles(event.target.value) })}
                className="min-w-0 flex-1 bg-transparent text-2xl font-bold tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
              />
            </div>
            <p className="text-xs text-slate-500">El total, con materiales y mano de obra.</p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-slate-900">¿En cuántos días lo terminás?</legend>
            <div className="flex flex-wrap gap-2 pt-1.5">
              <button type="button" aria-pressed={!b.otro && b.dias === 1} onClick={() => cambiar({ dias: 1, otro: false })} className={`h-11 rounded-xl border-[1.5px] px-3 text-sm font-semibold transition-colors ${!b.otro && b.dias === 1 ? "border-pro bg-emerald-50 text-pro-dark" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>
                Lo termino en el día
              </button>
              {DIAS_RAPIDOS.map((n) => (
                <button key={n} type="button" aria-pressed={!b.otro && b.dias === n} onClick={() => cambiar({ dias: n, otro: false })} className={`h-11 min-w-12 rounded-xl border-[1.5px] px-3 text-sm font-semibold transition-colors ${!b.otro && b.dias === n ? "border-pro bg-emerald-50 text-pro-dark" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>
                  {n}
                </button>
              ))}
              <button type="button" aria-pressed={b.otro} onClick={() => cambiar({ otro: true, dias: null })} className={`h-11 rounded-xl border-[1.5px] px-3.5 text-sm font-semibold transition-colors ${b.otro ? "border-pro bg-emerald-50 text-pro-dark" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>
                Otro
              </button>
              {b.otro && (
                <input
                  autoFocus
                  inputMode="numeric"
                  aria-label="Cantidad de días"
                  placeholder="días"
                  value={b.dias ?? ""}
                  onChange={(event) => { const n = Number(event.target.value.replace(/\D/g, "").slice(0, 3)); cambiar({ dias: n || null }); }}
                  className="h-11 w-24 rounded-xl border-[1.5px] border-pro px-3 text-base font-semibold text-slate-900 outline-none"
                />
              )}
            </div>
            <p className="text-xs text-slate-500">Cuentan desde que lo acepta.</p>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="presupuesto-detalle" className="text-sm font-semibold text-slate-900">Qué incluye <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea
              id="presupuesto-detalle"
              rows={3}
              maxLength={2000}
              value={b.detalle}
              onChange={(event) => cambiar({ detalle: event.target.value })}
              placeholder="Ej.: cambio de cartucho y flexibles, con materiales"
              className="block w-full resize-none rounded-2xl border-[1.5px] border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-pro focus:ring-4 focus:ring-emerald-600/15"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Así lo ve {para}</p>
            <div className="flex justify-center rounded-2xl bg-slate-100 p-3">
              <TarjetaPresupuesto propuesta={vistaPrevia} viewer="profesional" hora="ahora" />
            </div>
          </div>
        </div>

        <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3">
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="button" disabled={!ok || ocupado} onClick={enviar} className="min-h-12 w-full rounded-xl bg-pro px-4 text-base font-semibold text-white transition-colors hover:bg-pro-dark disabled:opacity-50">
            {ocupado ? "Enviando…" : ok ? `Enviar presupuesto · ${ars(valor)}` : falta}
          </button>
          <p className="text-center text-[11px] leading-snug text-slate-400">Si no responde, vence en {PROPOSAL_TTL_LABEL}. Uno por vez: el siguiente va cuando lo rechace o venza.</p>
        </footer>
      </section>
    </div>,
    document.body
  );
}
