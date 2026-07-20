"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { LogOutIcon } from "@/components/icons";
import { logoutAction } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera o con Escape: lo que espera cualquiera de un menú.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/entrar"
        className="shrink-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Entrar
      </Link>
    );
  }

  const isPro = user.role === "profesional";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.name}`}
        className="flex items-center gap-2 rounded-full p-0.5 transition-shadow hover:shadow-md"
      >
        <Avatar name={user.name} color={user.avatarColor} size={34} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute top-full right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 p-3">
            <Avatar name={user.name} color={user.avatarColor} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
            {isPro ? "Cuenta profesional" : "Cuenta cliente"}
          </p>

          <div className="pb-1">
            {isPro && user.professionalId && (
              <Link
                href={`/profesionales/${user.professionalId}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
              >
                Ver mi perfil público
              </Link>
            )}
            <Link
              href={isPro ? "/pro/mensajes" : "/mensajes"}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              Mensajes
            </Link>
          </div>

          <form action={logoutAction} className="border-t border-slate-100">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOutIcon width={16} height={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
