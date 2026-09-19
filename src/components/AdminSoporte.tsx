"use client";

import { useActionState } from "react";
import { saveSoporteAction, type SoporteState } from "@/app/admin/actions";
import { AYUDA_DEFAULT } from "@/lib/whatsapp";

/** Número y mensaje del botón "Necesito ayuda", que aparece en todo el sitio. */
export function AdminSoporte({ initial }: { initial: { phone: string; message: string; enabled: boolean } }) {
  const [state, formAction, pending] = useActionState<SoporteState, FormData>(saveSoporteAction, undefined);
  const values = state?.values ?? initial;

  return (
    // key: al volver la acción, React 19 ya limpió el form; remontarlo con los
    // valores devueltos es lo que deja a la vista lo que se escribió.
    <form key={JSON.stringify(state ?? "inicial")} action={formAction} className="adm-card max-w-xl space-y-4 p-4">
      <div className="space-y-1.5">
        <label htmlFor="soporte-phone" className="adm-label">WhatsApp de soporte</label>
        <div className="flex items-center gap-1.5">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-500">+549</span>
          <input id="soporte-phone" name="phone" defaultValue={values.phone} required inputMode="numeric" placeholder="3794123456"
            pattern="\d{10}" title="10 dígitos: característica sin 0 y número sin 15" className="adm-field w-40" />
        </div>
        <p className="text-xs text-slate-500">Característica sin 0 y número sin 15, todo junto: 10 dígitos.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="soporte-message" className="adm-label">Mensaje con el que arranca el chat</label>
        <textarea id="soporte-message" name="message" defaultValue={values.message} placeholder={AYUDA_DEFAULT} rows={2} maxLength={500}
          className="adm-field resize-none" />
        <p className="text-xs text-slate-500">Si lo dejás vacío se usa: “{AYUDA_DEFAULT}”</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="enabled" defaultChecked={values.enabled} className="size-4 accent-indigo-600" />
        Mostrar el botón “Necesito ayuda” en el sitio
      </label>
      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Guardado.</p>}
      <button disabled={pending} className="adm-btn">{pending ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
