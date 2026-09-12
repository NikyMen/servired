"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/app/(auth)/actions";
import { FormError, PasswordField, SubmitButton } from "@/components/auth/fields";

export function NuevaClaveForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(resetPasswordAction, undefined);

  return (
    <div className="animate-page-in">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Elegí una contraseña nueva</h2>
      <p className="mt-1.5 text-sm text-slate-500">Al guardarla se cierran las sesiones abiertas en otros dispositivos.</p>

      <form action={formAction} className="glass glass-solid mt-5 space-y-5 rounded-[1.5rem] p-5 sm:p-6">
        <input type="hidden" name="token" value={token} />
        <PasswordField id="password" label="Contraseña nueva" autoComplete="new-password" tone="cliente" />
        <div className="space-y-3">
          <FormError message={state?.error} />
          <SubmitButton tone="cliente" pendingLabel="Guardando…">Guardar y entrar</SubmitButton>
          <p className="text-center text-sm text-slate-500">
            ¿Venció el enlace?{" "}
            <Link href="/recuperar-clave" className="font-semibold text-cliente-dark hover:underline">Pedí otro</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
