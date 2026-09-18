"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthState } from "@/app/(auth)/actions";
import { FormError, PasswordField, SubmitButton } from "@/components/auth/fields";

const FIELD = "glass-field px-3.5 py-3 text-sm";

export function RegisterForm({ next, providerType, localities }: { next?: string; providerType?: "profesional" | "oficio"; localities: { id: string; name: string; province: string }[] }) {
  const [state, formAction] = useActionState<AuthState, FormData>(registerAction, undefined);
  const query = new URLSearchParams();
  if (next) query.set("next", next);
  if (providerType) query.set("tipo", providerType);
  const oauthQuery = query.toString();
  const values = state?.values ?? {};

  return (
    <div data-modo="cliente" className="animate-page-in">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Creá tu cuenta</h2>
      <p className="mt-1.5 text-sm text-slate-500">Empezás en Busco. Si querés ofrecer, después completás la verificación.</p>
      {providerType && <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Al verificar tu email continuás el alta como {providerType === "profesional" ? "Profesional" : "Oficio"}.</p>}

      {/* key: al volver con error React 19 ya vació el form; remontarlo repone lo escrito. */}
      <form key={JSON.stringify(state?.values ?? null)} action={formAction} className="glass glass-solid mt-5 space-y-5 rounded-[1.5rem] p-5 sm:p-6">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={`/api/auth/oauth/google${oauthQuery ? `?${oauthQuery}` : ""}`} className="glass-btn glass-btn-ghost justify-center px-3 py-2.5 text-sm">Continuar con Google</a>
          <a href={`/api/auth/oauth/facebook${oauthQuery ? `?${oauthQuery}` : ""}`} className="glass-btn glass-btn-ghost justify-center px-3 py-2.5 text-sm">Continuar con Facebook</a>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>o con email</span><span className="h-px flex-1 bg-slate-200" /></div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Nombre y apellido<input name="name" required minLength={3} autoComplete="name" placeholder="María González" defaultValue={values.name} className={FIELD} /></label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Email<input name="email" required type="email" autoComplete="email" placeholder="vos@email.com" defaultValue={values.email} className={FIELD} /></label>
        <PasswordField id="password" label="Contraseña" autoComplete="new-password" tone="cliente" hint="Mínimo 8 caracteres." />
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Localidad
          <select name="localityId" required defaultValue={values.localityId || localities[0]?.id} className={FIELD}>
            {localities.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.province}</option>)}
          </select>
          <span className="block text-xs font-normal text-slate-500">La usamos para mostrarte lo que tenés cerca cuando no compartís tu ubicación.</span>
        </label>
        {/* Nunca tildada de antemano; el enlace abre aparte para no perder lo escrito. */}
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-5 shrink-0" />
          <span>Leí y acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold text-cliente-dark underline">términos y condiciones</a>.</span>
        </label>
        <FormError message={state?.error} />
        <SubmitButton tone="cliente" pendingLabel="Creando tu cuenta…">Crear cuenta</SubmitButton>
        <p className="text-center text-sm text-slate-500">¿Ya tenés cuenta? <Link href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"} className="font-semibold text-cliente-dark hover:underline">Entrá</Link></p>
      </form>
    </div>
  );
}
