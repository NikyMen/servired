"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type AuthState } from "@/app/(auth)/actions";
import { FormError, SubmitButton } from "@/components/auth/fields";

export function RecuperarClaveForm({ enviado }: { enviado?: boolean }) {
  const [state, formAction] = useActionState<AuthState, FormData>(requestPasswordResetAction, undefined);

  return (
    <div className="animate-page-in">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Recuperá tu contraseña</h2>
      <p className="mt-1.5 text-sm text-slate-500">Te mandamos un enlace por correo para elegir una nueva.</p>

      {enviado ? (
        <div className="glass glass-solid mt-5 space-y-4 rounded-[1.5rem] p-5 sm:p-6">
          {/* El mensaje es el mismo exista o no la cuenta: quien prueba emails
              ajenos no se tiene que enterar de cuáles están registrados. */}
          <p className="text-sm text-slate-600">
            Si hay una cuenta con ese email, ya salió el enlace. Vence en 30 minutos y sirve una sola vez.
          </p>
          <p className="text-sm text-slate-500">Revisá también el correo no deseado.</p>
          <Link href="/entrar" className="glass-btn glass-btn-ghost inline-flex px-4 py-2.5 text-sm">Volver a entrar</Link>
        </div>
      ) : (
        <form action={formAction} className="glass glass-solid mt-5 space-y-5 rounded-[1.5rem] p-5 sm:p-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email de tu cuenta</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="vos@email.com" className="glass-field px-3.5 py-3 text-sm" />
          </div>
          <div className="space-y-3">
            <FormError message={state?.error} />
            <SubmitButton tone="cliente" pendingLabel="Enviando…">Mandame el enlace</SubmitButton>
            <p className="text-center text-sm text-slate-500">
              ¿Te acordaste?{" "}
              <Link href="/entrar" className="font-semibold text-cliente-dark hover:underline">Entrá</Link>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
