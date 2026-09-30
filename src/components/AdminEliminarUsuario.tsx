"use client";

import { useActionState, useState } from "react";
import { eliminarUsuarioAction, type EliminarUsuarioState } from "@/app/admin/actions";

/**
 * Borrar una cuenta desde Usuarios. El botón abre la confirmación con la
 * contraseña de administración; sin ella el servidor no borra nada.
 */
export function AdminEliminarUsuario({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState<EliminarUsuarioState, FormData>(eliminarUsuarioAction, undefined);

  if (!abierto) {
    return <button type="button" onClick={() => setAbierto(true)} className="adm-btn adm-btn-danger adm-btn-sm">Eliminar</button>;
  }

  return (
    <form action={formAction} className="w-64 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-red-700">
        Se borra <strong>{nombre}</strong> con todo lo suyo, incluso trabajos en curso y pagos pendientes. No se puede deshacer.
      </p>
      <input name="password" type="password" required autoFocus autoComplete="current-password"
        placeholder="Contraseña de administración" aria-label="Contraseña de administración" className="adm-field" />
      {state?.error && <p role="alert" className="text-xs font-semibold text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="adm-btn adm-btn-danger adm-btn-sm">{pending ? "Eliminando…" : "Eliminar para siempre"}</button>
        <button type="button" disabled={pending} onClick={() => setAbierto(false)} className="adm-btn adm-btn-ghost adm-btn-sm">Cancelar</button>
      </div>
    </form>
  );
}
