"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/(auth)/actions";
import { PasswordField, SubmitButton, FormError } from "@/components/auth/fields";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <div className="animate-page-in">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Entrá a tu cuenta
      </h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Retomá donde dejaste, del lado que estabas.
      </p>

      <form action={formAction} className="glass glass-solid mt-5 space-y-5 rounded-[1.5rem] p-5 sm:p-6">
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
            className="glass-field px-3.5 py-3 text-sm"
          />
        </div>

        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="current-password"
          tone="cliente"
        />

        <div className="space-y-3">
          <FormError message={state?.error} />

          <SubmitButton tone="cliente" pendingLabel="Entrando…">
            Entrar
          </SubmitButton>

          <p className="text-center text-sm text-slate-500">
            ¿Todavía no tenés?{" "}
            <Link
              href={next ? `/crear-cuenta?next=${encodeURIComponent(next)}` : "/crear-cuenta"}
              className="font-semibold text-cliente-dark hover:underline"
            >
              Creá una gratis
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
