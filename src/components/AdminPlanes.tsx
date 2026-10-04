"use client";

import { useEffect, useState, useTransition } from "react";
import { restorePlanesAction, savePlanesAction } from "@/app/admin/actions";
import { LIMITES, PLAN_ICONOS, PLANES_DEFAULT, type Plan, type PlanIcono, type PlanesConfig } from "@/lib/planes-config";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

/** Mueve el elemento `i` un lugar para arriba (-1) o para abajo (+1). */
function mover<T>(lista: T[], i: number, paso: -1 | 1) {
  const j = i + paso;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

/** Listas de una línea por ítem: los renglones vacíos se limpian al guardar. */
const lineas = (texto: string) => texto.split("\n");

function Campo({ label, value, onChange, largo = false, placeholder, filas = 2 }: { label: string; value: string; onChange: (v: string) => void; largo?: boolean; placeholder?: string; filas?: number }) {
  return (
    <label className="block space-y-1">
      <span className="adm-label">{label}</span>
      {largo
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={filas} placeholder={placeholder} className="adm-field resize-y" />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="adm-field" />}
    </label>
  );
}

function Bloque({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card adm-card-pad space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
        {ayuda && <p className="mt-0.5 text-sm text-slate-500">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Flechas({ i, total, onMover, onBorrar, que }: { i: number; total: number; onMover: (paso: -1 | 1) => void; onBorrar: () => void; que: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" onClick={() => onMover(-1)} disabled={i === 0} aria-label={`Subir ${que}`} className="adm-btn adm-btn-ghost adm-btn-sm">↑</button>
      <button type="button" onClick={() => onMover(1)} disabled={i === total - 1} aria-label={`Bajar ${que}`} className="adm-btn adm-btn-ghost adm-btn-sm">↓</button>
      <button type="button" onClick={onBorrar} aria-label={`Quitar ${que}`} className="adm-btn adm-btn-danger adm-btn-sm">Quitar</button>
    </div>
  );
}

/**
 * Editor de todo lo que muestra /planes: textos, planes, precios, la tabla de
 * comparación y las preguntas. Se edita en memoria y se guarda todo junto.
 */
export function AdminPlanes({ initial, editado }: { initial: PlanesConfig; editado: string | null }) {
  const [config, setConfig] = useState(initial);
  const [guardado, setGuardado] = useState(initial);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const sucio = JSON.stringify(config) !== JSON.stringify(guardado);

  // Que no se pierdan los cambios por cerrar la pestaña sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  const cambiar = (parcial: Partial<PlanesConfig>) => { setConfig((c) => ({ ...c, ...parcial })); setAviso(null); };
  const cambiarPlan = (i: number, parcial: Partial<Plan>) => cambiar({ planes: config.planes.map((p, j) => (j === i ? { ...p, ...parcial } : p)) });
  const filas = config.comparacion.filas;
  const cambiarFilas = (nuevas: typeof filas) => cambiar({ comparacion: { ...config.comparacion, filas: nuevas } });

  function agregarPlan() {
    const id = `plan-${Date.now().toString(36)}`;
    cambiar({
      planes: [...config.planes, { id, name: "Plan nuevo", description: "", audience: "", monthlyPrice: 0, icon: "star", includes: "", features: [], highlight: false }],
      comparacion: { ...config.comparacion, filas: filas.map((f) => ({ ...f, values: { ...f.values, [id]: "no" } })) },
    });
  }

  function guardar() {
    startTransition(async () => {
      const r = await savePlanesAction(JSON.stringify(config));
      if (r?.error || !r?.config) return setAviso({ tipo: "error", texto: r?.error ?? "No se pudo guardar." });
      setConfig(r.config);
      setGuardado(r.config);
      setAviso({ tipo: "ok", texto: r.config.publicado ? "Guardado. Ya se ve en /planes." : "Guardado. La página sigue sin publicar: solo la ves vos." });
    });
  }

  function restaurar() {
    if (!confirm("¿Volver a los planes y textos originales? Se pierde todo lo que editaste.")) return;
    startTransition(async () => {
      await restorePlanesAction();
      setConfig(PLANES_DEFAULT);
      setGuardado(PLANES_DEFAULT);
      setAviso({ tipo: "ok", texto: "Volvió a la versión original." });
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <Bloque titulo="Publicación" ayuda={editado ? `Última modificación: ${editado}.` : "Todavía se muestra la maqueta original."}>
        <label className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${config.publicado ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <input type="checkbox" checked={config.publicado} onChange={(e) => cambiar({ publicado: e.target.checked })} className="mt-0.5 size-4 accent-emerald-600" />
          <span><strong>Publicar /planes para todos.</strong> Sin tildar, la página da 404 y solo la ve administración (logueada en este panel). No activa suscripciones ni cobros: es una página informativa.</span>
        </label>
        <Campo label="Cartel de arriba (vacío = sin cartel)" value={config.aviso} onChange={(aviso) => cambiar({ aviso })} largo />
      </Bloque>

      <Bloque titulo="Encabezado">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Etiqueta chica" value={config.encabezado.etiqueta} onChange={(etiqueta) => cambiar({ encabezado: { ...config.encabezado, etiqueta } })} />
          <div />
          <Campo label="Título" value={config.encabezado.titulo} onChange={(titulo) => cambiar({ encabezado: { ...config.encabezado, titulo } })} />
          <Campo label="Título, segunda línea (en verde)" value={config.encabezado.tituloDestacado} onChange={(tituloDestacado) => cambiar({ encabezado: { ...config.encabezado, tituloDestacado } })} />
        </div>
        <Campo label="Bajada" value={config.encabezado.bajada} onChange={(bajada) => cambiar({ encabezado: { ...config.encabezado, bajada } })} largo />
        <Campo label="Nota en verde" value={config.encabezado.nota} onChange={(nota) => cambiar({ encabezado: { ...config.encabezado, nota } })} />
      </Bloque>

      <Bloque titulo="Pago anual" ayuda="Si está activo, arriba de los planes aparece el selector Mensual / Anual.">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={config.anual.activo} onChange={(e) => cambiar({ anual: { ...config.anual, activo: e.target.checked } })} className="size-4 accent-indigo-600" />
          Ofrecer pago anual
        </label>
        {config.anual.activo && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="adm-label">Meses que se cobran en el pago anual</span>
              <input type="number" min={1} max={12} value={config.anual.mesesPagos} onChange={(e) => cambiar({ anual: { ...config.anual, mesesPagos: Number(e.target.value) } })} className="adm-field w-28" />
              <span className="block text-xs text-slate-500">10 = se pagan 10 meses y se usan 12.</span>
            </label>
            <Campo label="Etiqueta del botón Anual" value={config.anual.etiqueta} onChange={(etiqueta) => cambiar({ anual: { ...config.anual, etiqueta } })} placeholder="2 meses de regalo" />
          </div>
        )}
      </Bloque>

      <Bloque titulo={`Planes (${config.planes.length} de ${LIMITES.planes})`} ayuda="El orden de acá es el orden en la página. Precio 0 = plan gratis.">
        {config.planes.map((plan, i) => (
          <div key={plan.id} className={`space-y-3 rounded-xl border p-3 ${plan.highlight ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">{i + 1}. {plan.name || "Sin nombre"} <span className="font-normal text-slate-500">· {plan.monthlyPrice > 0 ? `${money.format(plan.monthlyPrice)} / mes` : "Gratis"}</span></p>
              <Flechas i={i} total={config.planes.length} que={`el plan ${plan.name}`} onMover={(paso) => cambiar({ planes: mover(config.planes, i, paso) })}
                onBorrar={() => { if (config.planes.length > 1 && confirm(`¿Quitar el plan ${plan.name}?`)) cambiar({ planes: config.planes.filter((_, j) => j !== i) }); }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo label="Nombre" value={plan.name} onChange={(name) => cambiarPlan(i, { name })} />
              <label className="block space-y-1">
                <span className="adm-label">Precio por mes (ARS)</span>
                <input type="number" min={0} step={100} value={plan.monthlyPrice} onChange={(e) => cambiarPlan(i, { monthlyPrice: Number(e.target.value) })} className="adm-field" />
              </label>
              <label className="block space-y-1">
                <span className="adm-label">Ícono</span>
                <select value={plan.icon} onChange={(e) => cambiarPlan(i, { icon: e.target.value as PlanIcono })} className="adm-field">
                  {Object.entries(PLAN_ICONOS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Descripción" value={plan.description} onChange={(description) => cambiarPlan(i, { description })} />
              <Campo label="Para quién es (pie de la tarjeta)" value={plan.audience} onChange={(audience) => cambiarPlan(i, { audience })} />
            </div>
            <Campo label="Frase antes de la lista" value={plan.includes} onChange={(includes) => cambiarPlan(i, { includes })} placeholder="Todo lo de Gratis, más" />
            <label className="block space-y-1">
              <span className="adm-label">Beneficios (uno por renglón, hasta {LIMITES.features})</span>
              <textarea value={plan.features.join("\n")} onChange={(e) => cambiarPlan(i, { features: lineas(e.target.value) })} rows={Math.max(3, plan.features.length + 1)} className="adm-field resize-y" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={plan.highlight} onChange={(e) => cambiarPlan(i, { highlight: e.target.checked })} className="size-4 accent-emerald-600" />
              Destacarlo como «Recomendado»
            </label>
          </div>
        ))}
        {config.planes.length < LIMITES.planes && <button type="button" onClick={agregarPlan} className="adm-btn adm-btn-ghost">+ Agregar plan</button>}
      </Bloque>

      <Bloque titulo="Base gratuita" ayuda="El recuadro debajo de los planes. Sin título ni ítems, no se muestra.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Etiqueta" value={config.base.etiqueta} onChange={(etiqueta) => cambiar({ base: { ...config.base, etiqueta } })} />
          <Campo label="Título" value={config.base.titulo} onChange={(titulo) => cambiar({ base: { ...config.base, titulo } })} />
        </div>
        <Campo label="Texto" value={config.base.texto} onChange={(texto) => cambiar({ base: { ...config.base, texto } })} largo />
        <label className="block space-y-1">
          <span className="adm-label">Ítems con tilde (uno por renglón, hasta {LIMITES.items})</span>
          <textarea value={config.base.items.join("\n")} onChange={(e) => cambiar({ base: { ...config.base, items: lineas(e.target.value) } })} rows={4} className="adm-field resize-y" />
        </label>
      </Bloque>

      <Bloque titulo="Tabla comparativa" ayuda="Cada celda: Incluido (tilde), No (raya) o un texto corto. Sin filas, la tabla no se muestra.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Etiqueta" value={config.comparacion.etiqueta} onChange={(etiqueta) => cambiar({ comparacion: { ...config.comparacion, etiqueta } })} />
          <Campo label="Título" value={config.comparacion.titulo} onChange={(titulo) => cambiar({ comparacion: { ...config.comparacion, titulo } })} />
        </div>
        <Campo label="Bajada" value={config.comparacion.bajada} onChange={(bajada) => cambiar({ comparacion: { ...config.comparacion, bajada } })} />
        <div className="overflow-x-auto">
          <table className="adm-table min-w-[760px]">
            <thead>
              <tr>
                <th>Fila</th>
                {config.planes.map((plan) => <th key={plan.id}>{plan.name}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i}>
                  <td><input value={fila.label} onChange={(e) => cambiarFilas(filas.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))} className="adm-field min-w-48" aria-label={`Texto de la fila ${i + 1}`} /></td>
                  {config.planes.map((plan) => {
                    const valor = fila.values[plan.id] ?? "no";
                    const modo = valor === "si" ? "si" : valor === "no" ? "no" : "texto";
                    const poner = (v: string) => cambiarFilas(filas.map((f, j) => (j === i ? { ...f, values: { ...f.values, [plan.id]: v } } : f)));
                    return (
                      <td key={plan.id} className="space-y-1">
                        <select value={modo} onChange={(e) => poner(e.target.value === "texto" ? "" : e.target.value)} className="adm-field" aria-label={`${fila.label} en ${plan.name}`}>
                          <option value="si">✓ Incluido</option>
                          <option value="no">— No</option>
                          <option value="texto">Texto…</option>
                        </select>
                        {modo === "texto" && <input value={valor} onChange={(e) => poner(e.target.value)} placeholder="Ej.: 2 por mes" className="adm-field" aria-label={`Texto de ${fila.label} en ${plan.name}`} />}
                      </td>
                    );
                  })}
                  <td><Flechas i={i} total={filas.length} que={`la fila ${fila.label}`} onMover={(paso) => cambiarFilas(mover(filas, i, paso))} onBorrar={() => cambiarFilas(filas.filter((_, j) => j !== i))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filas.length < LIMITES.filas && (
          <button type="button" onClick={() => cambiarFilas([...filas, { label: "Fila nueva", values: Object.fromEntries(config.planes.map((p) => [p.id, "no"])) }])} className="adm-btn adm-btn-ghost">+ Agregar fila</button>
        )}
        <Campo label="Nota debajo de la tabla" value={config.comparacion.nota} onChange={(nota) => cambiar({ comparacion: { ...config.comparacion, nota } })} largo />
      </Bloque>

      <Bloque titulo="Preguntas frecuentes" ayuda="Sin preguntas, la sección no se muestra.">
        <Campo label="Título de la sección" value={config.faqTitulo} onChange={(faqTitulo) => cambiar({ faqTitulo })} />
        {config.faqs.map((faq, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">Pregunta {i + 1}</span>
              <Flechas i={i} total={config.faqs.length} que={`la pregunta ${i + 1}`} onMover={(paso) => cambiar({ faqs: mover(config.faqs, i, paso) })} onBorrar={() => cambiar({ faqs: config.faqs.filter((_, j) => j !== i) })} />
            </div>
            <Campo label="Pregunta" value={faq.question} onChange={(question) => cambiar({ faqs: config.faqs.map((f, j) => (j === i ? { ...f, question } : f)) })} />
            <Campo label="Respuesta" value={faq.answer} onChange={(answer) => cambiar({ faqs: config.faqs.map((f, j) => (j === i ? { ...f, answer } : f)) })} largo filas={3} />
          </div>
        ))}
        {config.faqs.length < LIMITES.faqs && <button type="button" onClick={() => cambiar({ faqs: [...config.faqs, { question: "", answer: "" }] })} className="adm-btn adm-btn-ghost">+ Agregar pregunta</button>}
      </Bloque>

      <div className="sticky bottom-3 z-10">
        <div className="adm-card flex flex-wrap items-center justify-between gap-3 p-3 shadow-lg">
          <p role="status" className={`text-sm ${aviso?.tipo === "error" ? "font-semibold text-red-600" : aviso ? "text-emerald-700" : sucio ? "font-semibold text-amber-700" : "text-slate-500"}`}>
            {aviso?.texto ?? (sucio ? "Tenés cambios sin guardar." : "Sin cambios.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/planes" target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-ghost">Ver la página</a>
            <button type="button" onClick={restaurar} disabled={pending} className="adm-btn adm-btn-ghost">Volver al original</button>
            <button type="button" onClick={() => { setConfig(guardado); setAviso(null); }} disabled={!sucio || pending} className="adm-btn adm-btn-ghost">Descartar</button>
            <button type="button" onClick={guardar} disabled={!sucio || pending} className="adm-btn">{pending ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
