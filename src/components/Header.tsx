"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ModeSwitch } from "@/components/ModeSwitch";
import { UserMenu } from "@/components/UserMenu";
import { SearchIcon } from "@/components/icons";
import type { SessionUser } from "@/lib/auth";
import type { Mode } from "@/lib/types";
import type { SVGProps } from "react";

type NavItem = {
  href: string;
  label: string;
  icon?: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
};

const clientNav: NavItem[] = [
  { href: "/", label: "Buscar", icon: SearchIcon },
  { href: "/solicitudes", label: "Solicitudes" },
  { href: "/contrataciones", label: "Propuestas" },
  { href: "/mensajes", label: "Mensajes" },
];

const proNav: NavItem[] = [
  { href: "/pro", label: "Panel" },
  { href: "/pro/mensajes", label: "Mensajes" },
];

export function Header({ mode, user }: { mode: Mode; user: SessionUser | null }) {
  const pathname = usePathname();
  const nav = mode === "pro" ? proNav : clientNav;

  return (
    // glass-bar y no glass: una barra pegada no lleva borde completo ni
    // sombra larga, sólo la línea del lado por el que pasa el contenido.
    <header className="glass-bar sticky top-0 z-30 border-b border-white/50 shadow-[0_10px_30px_-24px_rgb(15_23_42_/_0.6)]">
      {/* Filo de color del modo: se desvanece a los costados para que no
          parezca una regla apoyada sobre el vidrio. */}
      <div
        className="h-[3px] bg-[linear-gradient(90deg,transparent,rgb(var(--accent-rgb)/0.9),rgb(var(--accent-rgb)/0.35),transparent)]"
        aria-hidden
      />
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
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // El inactivo no es vidrio: si todos los ítems fueran una
                // superficie, la barra sería una pila de rectángulos y no se
                // vería cuál está activo.
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "glass-chip glass-chip-on"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                {Icon && <Icon width={16} height={16} />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Uno solo: antes había dos (uno por breakpoint) y se veían los dos
              juntos, porque .mode-switch estaba fuera de @layer y le ganaba al
              `hidden` de Tailwind. Ahora achica con clases responsive. */}
          <ModeSwitch mode={mode} />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
