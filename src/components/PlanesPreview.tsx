"use client";

import { useEffect, useRef, useState } from "react";
import { BriefcaseIcon, CheckCircleIcon, ChevronLeftIcon, SparklesIcon, WhatsAppIcon } from "@/components/icons";

const plans = [
  {
    id: "gratis",
    name: "Gratis",
    description: "Tu lugar en ServiRed, desde el primer día.",
    audience: "Para empezar y trabajar a tu ritmo.",
    monthlyPrice: 0,
    icon: CheckCircleIcon,
    includes: "Todo lo esencial, sin suscripción",
    features: ["Perfil en búsquedas y mapa", "Recibí y respondé solicitudes", "Chat, presupuestos y contrataciones", "Fotos de tus trabajos y reseñas"],
    highlight: false,
  },
  {
    id: "contacto",
    name: "Contacto",
    description: "Una puerta más para que te contacten.",
    audience: "Para profesionales que coordinan por WhatsApp.",
    monthlyPrice: 4900,
    icon: WhatsAppIcon,
    includes: "Todo lo de Gratis, más",
    features: ["Número de WhatsApp en tu perfil", "Botón de contacto directo", "QR para compartir tu perfil", "Tarjeta digital personalizada"],
    highlight: false,
  },
  {
    id: "impulso",
    name: "Impulso",
    description: "Dale más visibilidad a lo que hacés.",
    audience: "Para quienes quieren hacer crecer su clientela.",
    monthlyPrice: 9900,
    icon: SparklesIcon,
    includes: "Todo lo de Contacto, más",
    features: ["Espacio destacado por rubro y zona", "Rotación en módulos patrocinados", "Video de presentación en tu perfil", "Métricas de visitas y contactos"],
    highlight: true,
  },
  {
    id: "negocio",
    name: "Negocio",
    description: "Más herramientas para vos y tu equipo.",
    audience: "Para negocios y equipos de servicios.",
    monthlyPrice: 19900,
    icon: BriefcaseIcon,
    includes: "Todo lo de Impulso, más",
    features: ["Página con la marca de tu negocio", "Hasta 3 integrantes del equipo", "2 campañas locales por mes", "Reportes y soporte prioritario"],
    highlight: false,
  },
] as const;

type Plan = (typeof plans)[number];
type Period = "mensual" | "anual";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// Propuesta anual: 10 mensualidades, pagadas juntas (2 meses bonificados).
function annualPrice(plan: Plan) {
  return plan.monthlyPrice * 10;
}

const comparison: { label: string; values: readonly (boolean | string)[] }[] = [
  { label: "Perfil, búsquedas y mapa", values: [true, true, true, true] },
  { label: "Solicitudes y mensajes sin cupos", values: [true, true, true, true] },
  { label: "Presupuestos, contrataciones y reseñas", values: [true, true, true, true] },
  { label: "WhatsApp público y contacto directo", values: [false, true, true, true] },
  { label: "QR y tarjeta digital personalizada", values: [false, true, true, true] },
  { label: "Visibilidad en espacios patrocinados", values: [false, false, "Rotación local", "Rotación + campañas"] },
  { label: "Video y métricas del perfil", values: [false, false, true, true] },
  { label: "Página de negocio y equipo", values: [false, false, false, "Hasta 3 integrantes"] },
  { label: "Campañas locales", values: [false, false, false, "2 por mes"] },
  { label: "Verificación de identidad", values: ["Mismo proceso", "Mismo proceso", "Mismo proceso", "Mismo proceso"] },
];

const faqs = [
  {
    question: "¿Tengo que pagar si busco un profesional?",
    answer: "No. Buscar profesionales, publicar solicitudes, conversar y contratar sigue siendo gratis para clientes. Los planes pagos están pensados únicamente para quienes ofrecen servicios.",
  },
  {
    question: "¿Puedo conseguir clientes con el plan Gratis?",
    answer: "Sí. La propuesta mantiene el perfil, la aparición en búsquedas y mapa, las solicitudes, el chat y las contrataciones sin cupos de contactos. Los planes pagos agregan herramientas opcionales para presentarte, promocionarte y gestionar tu negocio.",
  },
  {
    question: "¿Pagar me garantiza trabajos o una mejor calificación?",
    answer: "No. Los espacios de promoción se identificarían como patrocinados y rotarían según rubro y zona. La contratación depende del cliente; las reseñas y la verificación de identidad siguen el mismo proceso en todos los planes.",
  },
  {
    question: "¿Qué pasaría si cancelo un plan pago?",
    answer: "La propuesta es volver a Gratis al terminar el período abonado, conservando el perfil, las reseñas, los mensajes y el historial. Se desactivarían los beneficios pagos. En el plan anual, el importe se abonaría por adelantado.",
  },
  {
    question: "¿La suscripción incluye el costo de los trabajos?",
    answer: "No. Los importes de esta maqueta corresponden solamente al plan del profesional. El precio de cada trabajo se acuerda con el cliente; las condiciones y los cargos del medio de pago se informan por separado.",
  },
  {
    question: "¿Ya puedo suscribirme?",
    answer: "Todavía no. Esta sección es una vista previa para evaluar los planes. Los precios en pesos argentinos y los beneficios son tentativos; elegir una tarjeta no activa una suscripción ni genera un cobro.",
  },
];

export function PlanesPreview() {
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
          <p className="text-xs font-bold tracking-[0.18em] text-pro-dark uppercase">Planes para profesionales y oferentes</p>
          <h1 id="planes-title" className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
            Tu oficio.<br /><span className="text-pro-dark">Más oportunidades.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Empezá gratis. Sumá contacto directo, visibilidad y herramientas para tu negocio cuando las necesites.
          </p>
          <p className="mt-4 text-sm font-medium text-pro-dark">Para quienes buscan profesionales, ServiRed sigue siendo gratis.</p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
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
                {value === "anual" && <span className={`rounded-full px-2 py-1 text-[10px] ${period === "anual" ? "bg-white/15 text-white" : "bg-pro-soft text-pro-dark"}`}>2 meses de regalo</span>}
              </button>
            ))}
          </div>
          <p className="min-h-5 text-center text-xs text-slate-600" aria-live="polite">
            {period === "anual" ? "Pago anual por adelantado. El valor mensual es un equivalente." : "Precios de ejemplo en pesos argentinos (ARS)."}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
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
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
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

      <section aria-labelledby="base-title" className="glass glass-solid grid gap-6 rounded-3xl p-6 sm:p-8 md:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="inline-flex rounded-full bg-pro-soft px-3 py-1 text-xs font-semibold text-pro-dark">Una base gratuita para todos</span>
          <h2 id="base-title" className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Tu trabajo tiene lugar acá.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">Queremos que puedas conseguir clientes desde el primer día. Pagás solamente si elegís sumar herramientas para tu actividad.</p>
        </div>
        <ul className="grid content-center gap-4 sm:grid-cols-2">
          {["Solicitudes sin cupos", "Mensajes y presupuestos", "Perfil, fotos y reseñas", "Verificación en todos los planes"].map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-700"><CheckCircleIcon width={20} height={20} className="shrink-0 text-pro" aria-hidden="true" />{feature}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="comparison-title">
        <div className="mb-6">
          <p className="text-xs font-bold tracking-wide text-pro-dark uppercase">Cada herramienta, en su lugar</p>
          <h2 id="comparison-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compará los planes</h2>
          <p className="mt-2 text-sm text-slate-600">La misma base. Distintas formas de hacer crecer tu actividad.</p>
        </div>
        <div tabIndex={0} role="region" aria-label="Comparación de planes. En pantallas chicas podés desplazar la tabla horizontalmente." className="glass glass-solid overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <caption className="sr-only">Beneficios propuestos para los cuatro planes de ServiRed</caption>
            <thead>
              <tr className="border-b border-slate-200/70">
                <th scope="col" className="px-5 py-5 font-semibold text-slate-600">Qué incluye</th>
                {plans.map((plan) => <th key={plan.id} scope="col" className={`px-4 py-5 text-center text-sm font-bold ${plan.highlight ? "bg-pro-soft/70 text-pro-dark" : "text-slate-900"}`}>{plan.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.label} className="border-b border-slate-200/60 last:border-0">
                  <th scope="row" className="px-5 py-4 font-medium text-slate-700">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={plans[index].id} className={`px-4 py-4 text-center ${plans[index].highlight ? "bg-pro-soft/40" : ""}`}>
                      {value === true ? <><CheckCircleIcon width={18} height={18} className="mx-auto text-pro" aria-hidden="true" /><span className="sr-only">Incluido</span></> : value === false ? <><span aria-hidden="true" className="text-slate-400">—</span><span className="sr-only">No incluido</span></> : <span className="text-slate-600">{value}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Los destacados serían espacios patrocinados con rotación local. Ningún plan garantiza contrataciones ni modifica las reseñas o la verificación.</p>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl">
        <h2 id="faq-title" className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Antes de elegir</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="glass glass-solid group rounded-2xl">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                {faq.question}<ChevronLeftIcon width={18} height={18} className="shrink-0 -rotate-90 text-pro-dark transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
