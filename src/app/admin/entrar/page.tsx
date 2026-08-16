"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdminAction, type AdminAuthState } from "@/app/admin/actions";
import { Logo } from "@/components/Logo";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState<AdminAuthState, FormData>(
    loginAdminAction,
    undefined,
  );

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md">
        <Logo href="/" accent="cliente" height={38} />
        <form action={formAction} className="mt-10 glass glass-solid space-y-5 rounded-2xl p-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administración</h1>
            <p className="mt-1 text-sm text-slate-500">Ingresá al panel de gestión.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="text-sm font-medium text-slate-700">Email</label>
            <input id="admin-email" name="email" type="email" required autoComplete="username"
              className="glass-field px-3.5 py-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-sm font-medium text-slate-700">Contraseña</label>
            <input id="admin-password" name="password" type="password" required autoComplete="current-password"
              className="glass-field px-3.5 py-3 text-sm" />
          </div>
          {state?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-cliente px-4 py-3 text-sm font-medium text-white hover:bg-cliente-dark disabled:opacity-60">
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
          <Link href="/" className="block text-center text-sm text-slate-500 hover:underline">Volver al inicio</Link>
        </form>
      </div>
    </main>
  );
}
