"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdminAction, type AdminAuthState } from "@/app/admin/actions";
import { LogoMark } from "@/components/Logo";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState<AdminAuthState, FormData>(
    loginAdminAction,
    undefined,
  );

  return (
    // data-admin: el fondo del panel es gris parejo, sin las manchas de color
    // del sitio. La entrada tiene que parecerse a adonde va, no a la portada.
    <main data-admin className="adm flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <LogoMark size={34} />
          <div>
            <p className="text-sm font-bold text-slate-900">ServiRed</p>
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Administración</p>
          </div>
        </div>

        <form action={formAction} className="adm-card space-y-4 p-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Ingresar al panel</h1>
            <p className="mt-0.5 text-sm text-slate-500">Acceso restringido al equipo de ServiRed.</p>
          </div>

          <div>
            <label htmlFor="admin-email" className="adm-label">Email</label>
            <input id="admin-email" name="email" type="email" required autoComplete="username" className="adm-field" />
          </div>
          <div>
            <label htmlFor="admin-password" className="adm-label">Contraseña</label>
            <input id="admin-password" name="password" type="password" required autoComplete="current-password" className="adm-field" />
          </div>

          {state?.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <button type="submit" disabled={pending} className="adm-btn w-full py-2.5">
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
          <Link href="/" className="block text-center text-sm text-slate-500 hover:text-slate-700 hover:underline">Volver al inicio</Link>
        </form>
      </div>
    </main>
  );
}
