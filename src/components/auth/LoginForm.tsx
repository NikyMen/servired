"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/(auth)/actions";
import { PasswordField, SubmitButton, FormError } from "@/components/auth/fields";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900">Entrá a tu cuenta</h2>
      <p className="mt-1 text-sm text-slate-500">
        ¿Todavía no tenés?{" "}
        <Link
          href={next ? `/crear-cuenta?next=${encodeURIComponent(next)}` : "/crear-cuenta"}
          className="font-semibold text-cliente hover:underline"
        >
          Creá una gratis
        </Link>
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vos@email.com"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition-colors focus:border-cliente focus:ring-2 focus:ring-cliente/20"
          />
        </div>

        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="current-password"
          tone="cliente"
        />

        <FormError message={state?.error} />

        <SubmitButton tone="cliente" pendingLabel="Entrando…">
          Entrar
        </SubmitButton>
      </form>

      <DemoHint />
    </div>
  );
}

/** Atajo para probar la app sin crear cuenta. Los datos salen del seed. */
function DemoHint() {
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
        Cuentas de prueba
      </p>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-slate-500">Cliente:</dt>
          <dd className="font-mono text-xs text-slate-700">maria@servired.test</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-slate-500">Profesional:</dt>
          <dd className="font-mono text-xs text-slate-700">martin@servired.test</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-slate-500">Clave:</dt>
          <dd className="font-mono text-xs text-slate-700">servired123</dd>
        </div>
      </dl>
    </div>
  );
}
