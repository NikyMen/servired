"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ModeSwitch } from "@/components/ModeSwitch";
import { UserMenu } from "@/components/UserMenu";
import { Campanita } from "@/components/Campanita";
import { SearchBox } from "@/components/SearchBox";
import { NoLeidosBadge, useNoLeidos } from "@/components/NoLeidos";
import type { SessionUser } from "@/lib/auth";
import type { Mode } from "@/lib/types";
import type { SVGProps } from "react";

type NavItem = {
  href: string;
  label: string;
  icon?: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  /** Lleva el globito de mensajes sin leer. */
  noLeidos?: boolean;
};

const clientNav: NavItem[] = [
  { href: "/solicitudes", label: "Solicitudes" },
  { href: "/contrataciones", label: "Propuestas" },
  { href: "/mensajes", label: "Mensajes", noLeidos: true },
];

const proNav: NavItem[] = [
  { href: "/pro", label: "Panel" },
  { href: "/pro/solicitudes", label: "Ver solicitudes" },
  { href: "/pro/mensajes", label: "Mensajes", noLeidos: true },
];

export function Header({ mode, user }: { mode: Mode; user: SessionUser | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nav = mode === "pro" ? proNav : clientNav;
  const { total } = useNoLeidos();
  const rawType = searchParams.get("tipo");
  const searchType = rawType === "profesional" || rawType === "oficio" ? rawType : undefined;
  const searchCategory = searchParams.get("categoria") || undefined;
  const searchQuery = searchParams.get("q") || "";

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
      {/* En móvil es grilla y no flex-wrap: flex salta de línea antes que
          achicar, y dejaba el logo solo arriba con el interruptor y "Entrar"
          abajo. Así la fila 1 es logo (se achica) + controles (no), y la
          búsqueda ocupa la fila 2 entera. Desde md vuelve a ser una sola fila. */}
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 px-4 py-3 md:flex md:gap-2">
        <Logo
          accent={mode}
          href={mode === "pro" ? "/pro" : "/"}
          fluid
          className="min-w-0 max-w-full justify-self-start md:mr-2 md:shrink-0"
        />

        {mode === "cliente" && (
          <div className="col-span-2 row-start-2 md:max-w-xs md:flex-1">
            <SearchBox key={`${searchType || "todos"}:${searchCategory || "todos"}:${searchQuery}`} variant="nav" defaultQuery={searchQuery} categoria={searchCategory} tipo={searchType} />
          </div>
        )}

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
                {item.noLeidos && <NoLeidosBadge n={total} className="-mr-1" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:ml-auto">
          {/* Uno solo: antes había dos (uno por breakpoint) y se veían los dos
              juntos, porque .mode-switch estaba fuera de @layer y le ganaba al
              `hidden` de Tailwind. Ahora achica con clases responsive. */}
          <ModeSwitch mode={mode} />
          {/* Sin sesión no hay avisos que mostrar. */}
          {user && <Campanita />}
          <UserMenu user={user} mode={mode} />
        </div>
      </div>
    </header>
  );
}
