"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ModeSwitch } from "@/components/ModeSwitch";
import { UserMenu } from "@/components/UserMenu";
import type { SessionUser } from "@/lib/auth";
import type { Mode } from "@/lib/types";

const clientNav = [
  { href: "/", label: "Buscar" },
  { href: "/solicitudes", label: "Solicitudes" },
  { href: "/contrataciones", label: "Contrataciones" },
  { href: "/mensajes", label: "Mensajes" },
];

const proNav = [
  { href: "/pro", label: "Panel" },
  { href: "/pro/mensajes", label: "Mensajes" },
];

export function Header({ mode, user }: { mode: Mode; user: SessionUser | null }) {
  const pathname = usePathname();
  const nav = mode === "pro" ? proNav : clientNav;
  const activeCls =
    mode === "pro" ? "bg-pro-soft text-pro-dark" : "bg-cliente-soft text-cliente-dark";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      {/* Franja de color según el modo */}
      <div className={`h-1 transition-colors ${mode === "pro" ? "bg-pro" : "bg-cliente"}`} />
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <Logo
          accent={mode}
          href={mode === "pro" ? "/pro" : "/"}
          compactOnMobile
          className="shrink-0 md:mr-2"
        />

        {/* En móvil la navegación vive en la barra inferior */}
        <nav className="hidden min-w-0 items-center gap-1 md:flex">
          {nav.map((item) => {
            const active =
              item.href === "/" || item.href === "/pro"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? activeCls : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ModeSwitch mode={mode} size="sm" className="sm:hidden" />
          <ModeSwitch mode={mode} className="hidden sm:inline-flex" />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
