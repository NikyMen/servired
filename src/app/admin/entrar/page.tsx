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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <Logo href="/" accent="cliente" height={38} />
        <form action={formAction} className="mt-10 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administración</h1>
            <p className="mt-1 text-sm text-slate-500">Ingresá para ver las preinscripciones.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="text-sm font-medium text-slate-700">Email</label>
            <input id="admin-email" name="email" type="email" required autoComplete="username"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-sm font-medium text-slate-700">Contraseña</label>
            <input id="admin-password" name="password" type="password" required autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-cliente focus:ring-2 focus:ring-cliente/20" />
          </div>
          {state?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-cliente px-4 py-3 text-sm font-medium text-white hover:bg-cliente-dark disabled:opacity-60">
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
          <Link href="/" className="block text-center text-sm text-slate-500 hover:underline">Volver a la preinscripción</Link>
        </form>
      </div>
    </main>
  );
}
