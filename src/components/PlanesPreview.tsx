"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon, BriefcaseIcon, CameraIcon, ChatIcon, CheckCircleIcon, ChevronLeftIcon, MapPinIcon, SparklesIcon, StarIcon, VerifiedIcon, WhatsAppIcon } from "@/components/icons";
import { precioAnual, type Plan, type PlanIcono, type PlanesConfig } from "@/lib/planes-config";

const ICONOS: Record<PlanIcono, typeof CheckCircleIcon> = {
  check: CheckCircleIcon,
  whatsapp: WhatsAppIcon,
  sparkles: SparklesIcon,
  briefcase: BriefcaseIcon,
  star: StarIcon,
  verified: VerifiedIcon,
  map: MapPinIcon,
  chat: ChatIcon,
  camera: CameraIcon,
  bell: BellIcon,
};

type Period = "mensual" | "anual";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Con menos de cuatro planes las tarjetas no quedan con huecos. */
const COLUMNAS = ["", "xl:grid-cols-1", "xl:grid-cols-2", "xl:grid-cols-3", "xl:grid-cols-4"];

/** Lo que dice la celda: "si" es tilde, "no" (o vacío) es raya, el resto se escribe tal cual. */
function valorCelda(valor: string | undefined): boolean | string {
  const v = (valor ?? "").trim();
  if (!v || v.toLowerCase() === "no") return false;
  if (v.toLowerCase() === "si" || v.toLowerCase() === "sí") return true;
  return v;
}

export function PlanesPreview({ config }: { config: PlanesConfig }) {
  const plans = config.planes;
  const comparison = config.comparacion.filas;
  const faqs = config.faqs;
  const anual = config.anual.activo;
  const annualPrice = (plan: Plan) => precioAnual(plan, config);
  const [period, setPeriod] = useState<Period>("mensual");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPlan) return;
    selectionRef.current?.focus({ preventScroll: true });
    selectionRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "nearest",
    });
  }, [selectedPlan]);

  return (
    <div className="space-y-14 sm:space-y-20">
      <section aria-labelledby="planes-title">
        <div className="mx-auto max-w-3xl text-center">
          {config.encabezado.etiqueta && <p className="text-xs font-bold tracking-[0.18em] text-pro-dark uppercase">{config.encabezado.etiqueta}</p>}
          <h1 id="planes-title" className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
            {config.encabezado.titulo}{config.encabezado.tituloDestacado && <><br /><span className="text-pro-dark">{config.encabezado.tituloDestacado}</span></>}
          </h1>
          {config.encabezado.bajada && <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{config.encabezado.bajada}</p>}
          {config.encabezado.nota && <p className="mt-4 text-sm font-medium text-pro-dark">{config.encabezado.nota}</p>}
        </div>

        {anual ? <div className="mt-8 flex flex-col items-center gap-3">
          <div role="group" aria-label="Período de facturación de ejemplo" className="glass inline-flex flex-wrap justify-center gap-1 rounded-2xl p-1.5">
            {(["mensual", "anual"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${period === value ? "bg-pro-dark text-white shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
              >
                {value === "mensual" ? "Mensual" : "Anual"}
                {value === "anual" && config.anual.etiqueta && <span className={`rounded-full px-2 py-1 text-[10px] ${period === "anual" ? "bg-white/15 text-white" : "bg-pro-soft text-pro-dark"}`}>{config.anual.etiqueta}</span>}
              </button>
            ))}
          </div>
          <p className="min-h-5 text-center text-xs text-slate-600" aria-live="polite">
            {period === "anual" ? "Pago anual por adelantado. El valor mensual es un equivalente." : "Precios de ejemplo en pesos argentinos (ARS)."}
          </p>
        </div> : <p className="mt-8 text-center text-xs text-slate-600">Precios en pesos argentinos (ARS).</p>}

        <div className={`mt-8 grid gap-4 sm:grid-cols-2 ${COLUMNAS[Math.min(plans.length, 4)]}`}>
          {plans.map((plan) => {
            const Icon = ICONOS[plan.icon];
            const isSelected = selectedPlan?.id === plan.id;
            const displayedPrice = period === "anual" ? Math.round(annualPrice(plan) / 12) : plan.monthlyPrice;

            return (
              <article key={plan.id} aria-labelledby={`plan-${plan.id}`} className={`glass glass-solid flex flex-col rounded-3xl p-5 sm:p-6 ${plan.highlight ? "border-pro/50 ring-2 ring-pro/30" : ""}`}>
                <div className="mb-5 flex min-h-9 items-center justify-between gap-2">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-pro-soft text-pro-dark"><Icon width={20} height={20} aria-hidden="true" /></span>
                  {plan.highlight && <span className="rounded-full bg-pro-dark px-3 py-1 text-[10px] font-semibold text-white">Recomendado</span>}
                </div>
                <h2 id={`plan-${plan.id}`} className="text-xl font-bold text-slate-900">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>
                <div className="mt-5">
                  <p className="text-[11px] font-medium text-slate-500">{plan.monthlyPrice === 0 ? "Siempre gratis" : "Precio tentativo"}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{money.format(displayedPrice)}</p>
                  <p className="mt-1 text-xs text-slate-600">{plan.monthlyPrice === 0 ? "sin suscripción" : `ARS / mes${period === "anual" ? " equivalente" : ""}`}</p>
                  <p className="mt-2 min-h-8 text-xs leading-4 text-slate-500">
                    {plan.monthlyPrice === 0 ? "Sin tarjeta de crédito." : period === "anual" ? `${money.format(annualPrice(plan))} ARS en un pago anual.` : "Facturación mensual propuesta."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Ver detalle del plan ${plan.name}`}
                  aria-expanded={isSelected}
                  aria-controls="plan-preview-detail"
                  onClick={() => setSelectedPlan(plan)}
                  className={`glass-btn mt-4 min-h-11 w-full px-3 py-3 text-sm ${plan.highlight ? "" : "glass-btn-ghost"}`}
                >
                  {isSelected ? "Plan seleccionado" : "Ver detalle"}
                </button>
                <div className="mt-6 flex-1 border-t border-slate-200/70 pt-5">
                  <p className="text-xs font-semibold text-slate-800">{plan.includes}</p>
                  <ul className="mt-4 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                        <CheckCircleIcon width={16} height={16} className="mt-0.5 shrink-0 text-pro" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-6 border-t border-slate-200/70 pt-4 text-xs leading-5 text-slate-500">{plan.audience}</p>
              </article>
            );
          })}
        </div>

        <div id="plan-preview-detail" hidden={!selectedPlan}>
          {selectedPlan && (
            <div ref={selectionRef} tabIndex={-1} aria-labelledby="selected-plan-title" className="glass glass-solid mt-6 grid gap-4 rounded-3xl p-5 sm:grid-cols-[1fr_auto] sm:p-6">
              <div>
                <p className="text-xs font-semibold text-pro-dark">Tu selección de ejemplo</p>
                <h2 id="selected-plan-title" className="mt-1 text-xl font-bold text-slate-900">{selectedPlan.name}{selectedPlan.monthlyPrice > 0 ? ` · ${period}` : " · sin suscripción"}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{selectedPlan.includes}: {selectedPlan.features.join("; ").toLowerCase()}.</p>
                <p className="mt-3 text-xs font-medium text-slate-600">Esta selección no activa beneficios ni realiza ningún cobro.</p>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-bold text-pro-dark">{money.format(period === "anual" ? annualPrice(selectedPlan) : selectedPlan.monthlyPrice)}</p>
                <p className="mt-1 text-xs text-slate-500">{selectedPlan.monthlyPrice === 0 ? "Siempre gratis" : period === "anual" ? "ARS / año · pago por adelantado" : "ARS / mes"}</p>
                <span className="mt-3 inline-block rounded-full bg-pro-soft px-3 py-1.5 text-xs font-semibold text-pro-dark">Vista previa</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {(config.base.titulo || config.base.items.length > 0) && <section aria-labelledby="base-title" className="glass glass-solid grid gap-6 rounded-3xl p-6 sm:p-8 md:grid-cols-[1fr_1.1fr]">
        <div>
          {config.base.etiqueta && <span className="inline-flex rounded-full bg-pro-soft px-3 py-1 text-xs font-semibold text-pro-dark">{config.base.etiqueta}</span>}
          <h2 id="base-title" className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{config.base.titulo}</h2>
          {config.base.texto && <p className="mt-3 text-sm leading-7 text-slate-600">{config.base.texto}</p>}
        </div>
        <ul className="grid content-center gap-4 sm:grid-cols-2">
          {config.base.items.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700"><CheckCircleIcon width={20} height={20} className="shrink-0 text-pro" aria-hidden="true" />{feature}</li>
          ))}
        </ul>
      </section>}

      {comparison.length > 0 && <section aria-labelledby="comparison-title">
        <div className="mb-6">
          {config.comparacion.etiqueta && <p className="text-xs font-bold tracking-wide text-pro-dark uppercase">{config.comparacion.etiqueta}</p>}
          <h2 id="comparison-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{config.comparacion.titulo}</h2>
          {config.comparacion.bajada && <p className="mt-2 text-sm text-slate-600">{config.comparacion.bajada}</p>}
        </div>
        <div tabIndex={0} role="region" aria-label="Comparación de planes. En pantallas chicas podés desplazar la tabla horizontalmente." className="glass glass-solid overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <caption className="sr-only">Beneficios de cada plan de ServiRed</caption>
            <thead>
              <tr className="border-b border-slate-200/70">
                <th scope="col" className="px-5 py-5 font-semibold text-slate-600">Qué incluye</th>
                {plans.map((plan) => <th key={plan.id} scope="col" className={`px-4 py-5 text-center text-sm font-bold ${plan.highlight ? "bg-pro-soft/70 text-pro-dark" : "text-slate-900"}`}>{plan.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={i} className="border-b border-slate-200/60 last:border-0">
                  <th scope="row" className="px-5 py-4 font-medium text-slate-700">{row.label}</th>
                  {plans.map((plan) => ({ plan, value: valorCelda(row.values[plan.id]) })).map(({ plan, value }) => (
                    <td key={plan.id} className={`px-4 py-4 text-center ${plan.highlight ? "bg-pro-soft/40" : ""}`}>
                      {value === true ? <><CheckCircleIcon width={18} height={18} className="mx-auto text-pro" aria-hidden="true" /><span className="sr-only">Incluido</span></> : value === false ? <><span aria-hidden="true" className="text-slate-400">—</span><span className="sr-only">No incluido</span></> : <span className="text-slate-600">{value}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {config.comparacion.nota && <p className="mt-3 text-xs leading-5 text-slate-500">{config.comparacion.nota}</p>}
      </section>}

      {faqs.length > 0 && <section aria-labelledby="faq-title" className="mx-auto max-w-3xl">
        <h2 id="faq-title" className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{config.faqTitulo}</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="glass glass-solid group rounded-2xl">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                {faq.question}<ChevronLeftIcon width={18} height={18} className="shrink-0 -rotate-90 text-pro-dark transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>}
    </div>
  );
}
