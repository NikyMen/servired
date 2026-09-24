"use client";

import { useActionState } from "react";
import { guardarOfertasDependenciaAction, type OfertasDependenciaState } from "@/app/pro/mi-perfil/actions";

/** Opción de la cuenta: quien la tilda aparece en la lista de administración. */
export function OfertasDependencia({ inicial }: { inicial: boolean }) {
  const [state, formAction, pending] = useActionState<OfertasDependenciaState, FormData>(guardarOfertasDependenciaAction, undefined);
  const valor = state?.value ?? inicial;
  return (
    <form key={String(valor)} action={formAction} className="glass glass-solid space-y-3 rounded-2xl p-4">
      <div>
        <h2 className="font-bold text-slate-900">Ofertas de empleo</h2>
        <p className="text-sm text-slate-500">Si la tildás, administración puede acercarte por privado ofertas de trabajo en relación de dependencia.</p>
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="ofertasDependencia" defaultChecked={valor} className="mt-0.5 size-5 shrink-0" />
        ¿Además de las oportunidades vinculadas a tu oficio, te gustaría recibir ofertas laborales en relación de dependencia?
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="glass-btn px-4 py-2 text-sm disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {state?.ok && <span role="status" className="text-sm text-emerald-700">Guardado.</span>}
        {state?.error && <span role="alert" className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
