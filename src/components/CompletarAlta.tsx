"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completarAltaAction, logoutAction, type CompletarAltaState } from "@/app/(auth)/actions";
import { TextoLegal } from "@/components/TextoLegal";
import type { Bloque } from "@/lib/site-text";

type Props = {
  titulo: string;
  pedirTerminos: boolean;
  textoTitulo: string;
  bloques: Bloque[];
  version: number;
  /** Vacía si la cuenta ya tiene localidad: entonces no se pide. */
  localidades: { id: string; name: string; province: string }[];
  tono: "cliente" | "pro";
};

/**
 * Pantalla que tapa el sitio hasta que la cuenta está al día: términos
 * vigentes aceptados y localidad elegida. Solo deja aceptar o cerrar sesión.
 */
export function CompletarAlta({ titulo, pedirTerminos, textoTitulo, bloques, version, localidades, tono }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CompletarAltaState, FormData>(completarAltaAction, undefined);
  const boton = tono === "pro" ? "bg-pro hover:bg-pro-dark" : "bg-cliente hover:bg-cliente-dark";

  // Lo de atrás no se mueve mientras la pantalla está abierta.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, []);

  // El layout se vuelve a armar ya con la cuenta al día, y esta pantalla desaparece.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="completar-alta-titulo" className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="glass glass-solid flex max-h-dvh w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:max-h-[90dvh] sm:rounded-3xl">
        <header className="border-b border-white/70 px-5 pt-5 pb-3">
          <h2 id="completar-alta-titulo" className="text-xl font-extrabold text-slate-900">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {pedirTerminos ? "Para seguir usando ServiRed tenés que leer y aceptar los términos y condiciones." : "Para mostrarte lo que está cerca, elegí dónde estás."}
          </p>
        </header>

        {pedirTerminos && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" tabIndex={0} aria-label={textoTitulo}>
            <h3 className="text-lg font-bold text-slate-900">{textoTitulo}</h3>
            <TextoLegal bloques={bloques} />
          </div>
        )}

        <div className="space-y-3 border-t border-white/70 px-5 py-4">
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="version" value={version} />
            {localidades.length > 0 && (
              <label className="block text-sm font-medium text-slate-700">
                Tu localidad
                <select name="localityId" required defaultValue={localidades[0]?.id} className="glass-field mt-1 w-full px-3 py-2.5 text-sm">
                  {localidades.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.province}</option>)}
                </select>
              </label>
            )}
            {pedirTerminos && (
              <label className="flex items-start gap-3 rounded-xl bg-white/60 p-3 text-sm text-slate-700">
                <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-5 shrink-0" />
                <span>Leí y acepto los términos y condiciones.</span>
              </label>
            )}
            {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
            <button disabled={pending || state?.ok} className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 ${boton}`}>
              {pending || state?.ok ? "Guardando…" : "Aceptar y seguir"}
            </button>
          </form>
          <form action={logoutAction}>
            <button className="w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-white/60">Cerrar sesión</button>
          </form>
        </div>
      </div>
    </div>
  );
}
