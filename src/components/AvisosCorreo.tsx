"use client";

import { useActionState } from "react";
import { guardarAvisosAction, type AvisosState } from "@/app/(client)/avisos-correo/actions";
import { ETIQUETA_AVISO, TIPOS_AVISO, type TipoAviso } from "@/lib/avisos-correo-tipos";

/** Qué avisos llegan por correo. Van en los dos perfiles: son preferencias de la cuenta. */
export function AvisosCorreo({ inicial }: { inicial: Record<TipoAviso, boolean> }) {
  const [state, formAction, pending] = useActionState<AvisosState, FormData>(guardarAvisosAction, undefined);
  const valores = state?.values ?? inicial;
  return (
    <form key={JSON.stringify(valores)} action={formAction} className="glass glass-solid space-y-3 rounded-2xl p-4">
      <div>
        <h2 className="font-bold text-slate-900">Avisos por correo</h2>
        <p className="text-sm text-slate-500">La campanita sigue avisándote igual; esto es lo que además te llega al mail.</p>
      </div>
      {TIPOS_AVISO.map((tipo) => (
        <label key={tipo} className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" name={tipo} defaultChecked={valores[tipo]} className="size-5" />
          {ETIQUETA_AVISO[tipo]}
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="glass-btn px-4 py-2 text-sm disabled:opacity-60">{pending ? "Guardando…" : "Guardar"}</button>
        {state?.ok && <span role="status" className="text-sm text-emerald-700">Guardado.</span>}
        {state?.error && <span role="alert" className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
