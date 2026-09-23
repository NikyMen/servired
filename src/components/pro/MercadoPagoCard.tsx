import { CheckCircleIcon, MercadoPagoIcon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import type { EstadoMercadoPago } from "@/lib/mercadopago";

/** El celeste de Mercado Pago y su azul oscuro. */
const CELESTE = "#009EE3";

const botonMP =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#009EE3] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#009EE3]/30 transition hover:-translate-y-0.5 hover:bg-[#0087c2] focus-visible:ring-4 focus-visible:ring-[#009EE3]/40";

/**
 * La tarjeta de cobros del panel pro, con los colores de Mercado Pago. Sin
 * vincular invita a hacerlo; vinculada lo muestra en grande y sin botón, que
 * solo vuelve si la conexión se cortó y hace falta autorizar de nuevo.
 */
export function MercadoPagoCard({ estado, aviso, comision }: { estado: EstadoMercadoPago; aviso?: string; comision: number }) {
  if (estado.estado === "vinculada") return <Vinculada cuenta={estado.cuenta} desde={estado.desde} recien={aviso === "conectado"} comision={comision} />;

  return (
    <section id="mercado-pago" aria-labelledby="mp-titulo" className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-sky-200/80 bg-white p-5 shadow-sm sm:p-6">
      {/* Fondo difuminado con los colores de Mercado Pago. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 size-64 rounded-full bg-[#009EE3]/30 blur-3xl" />
        <div className="absolute -right-16 -bottom-24 size-72 rounded-full bg-[#00B1EA]/25 blur-3xl" />
        <div className="absolute top-1/4 left-1/2 size-44 rounded-full bg-[#2D3277]/12 blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ backgroundColor: CELESTE }}>
            <MercadoPagoIcon width={30} height={30} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-[#009EE3] uppercase">Mercado Pago</p>
            <h2 id="mp-titulo" className="text-lg font-extrabold text-[#2D3277]">
              {estado.estado === "revincular" ? "Se cortó la conexión con tu cuenta" : "Cobrá tus trabajos con Mercado Pago"}
            </h2>
          </div>
        </div>

        {aviso === "error" && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">No pudimos vincular tu cuenta. Volvé a intentarlo.</p>}

        {estado.estado === "no_disponible" && (
          <p className="mt-4 text-sm text-slate-600">La vinculación se habilitará cuando ServiRed active Mercado Pago.</p>
        )}

        {estado.estado === "sin_vincular" && (
          <>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["La plata de cada trabajo llega directo a tu cuenta.", "Tus clientes pagan con tarjeta, débito o dinero en cuenta.", "El pago queda protegido por Mercado Pago."].map((texto) => (
                <li key={texto} className="flex items-start gap-2">
                  <CheckCircleIcon width={18} height={18} className="mt-px shrink-0 text-[#009EE3]" />
                  {texto}
                </li>
              ))}
            </ul>
            <a href="/api/mercadopago/conectar" className={`mt-5 w-full sm:w-auto ${botonMP}`}>
              <MercadoPagoIcon width={22} height={22} />
              Vincular con Mercado Pago
            </a>
            <p className="mt-2 text-xs text-slate-500">
              Te llevamos a Mercado Pago para que autorices a ServiRed. Tu clave nunca pasa por acá.
              {comision > 0 && ` ServiRed retiene el ${comision} % de cada cobro.`}
            </p>
          </>
        )}

        {estado.estado === "revincular" && (
          <>
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              Mercado Pago ya no nos deja cobrar en tu cuenta (N.º {estado.cuenta}). Pasa si quitaste el permiso o cambiaste la clave. Volvé a vincularla para seguir cobrando.
            </p>
            <a href="/api/mercadopago/conectar" className={`mt-4 w-full sm:w-auto ${botonMP}`}>
              <MercadoPagoIcon width={22} height={22} />
              Volver a vincular
            </a>
          </>
        )}
      </div>
    </section>
  );
}

function Vinculada({ cuenta, desde, recien, comision }: { cuenta: string; desde: Date; recien: boolean; comision: number }) {
  return (
    <section id="mercado-pago" aria-labelledby="mp-titulo" className="relative scroll-mt-24 overflow-hidden rounded-2xl bg-gradient-to-br from-[#00B1EA] via-[#009EE3] to-[#2D3277] p-5 text-white shadow-lg shadow-[#009EE3]/25 sm:p-6">
      {/* Brillos difuminados sobre el degradé. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-10 size-72 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-12 size-72 rounded-full bg-[#00B1EA]/50 blur-3xl" />
        <MercadoPagoIcon width={220} height={220} className="absolute -right-10 -bottom-16 text-white/10" />
      </div>

      <div className="relative">
        {recien && <p role="status" className="mb-4 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold backdrop-blur-sm">🎉 ¡Listo! Tu cuenta quedó vinculada.</p>}

        <div className="flex items-center gap-4">
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#009EE3] shadow-lg">
            <MercadoPagoIcon width={34} height={34} />
            <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
              <svg aria-hidden viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </span>
          </span>
          <div className="min-w-0">
            <h2 id="mp-titulo" className="text-xl font-extrabold">Mercado Pago vinculado</h2>
            <p className="flex items-center gap-2 text-sm text-white/90">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
              Listo para cobrar
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-white/90">Cuando un cliente paga un trabajo terminado, la plata llega directo a tu cuenta de Mercado Pago.</p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <dt className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Cuenta</dt>
            <dd className="font-bold">N.º {cuenta}</dd>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <dt className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Vinculada desde</dt>
            <dd className="font-bold">{formatDate(desde)}</dd>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <dt className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">Comisión ServiRed</dt>
            <dd className="font-bold">{comision > 0 ? `${comision} % por cobro` : "Sin comisión"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
