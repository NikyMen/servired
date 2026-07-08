"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import {
  SearchIcon,
  ClipboardIcon,
  BriefcaseIcon,
  ChatIcon,
  GridIcon,
  SwitchIcon,
} from "@/components/icons";

type Item = {
  href: string;
  label: string;
  icon: (p: SVGProps<SVGSVGElement>) => React.JSX.Element;
  exact?: boolean;
};

const clientItems: Item[] = [
  { href: "/", label: "Buscar", icon: SearchIcon, exact: true },
  { href: "/solicitudes", label: "Solicitudes", icon: ClipboardIcon },
  { href: "/contrataciones", label: "Contratos", icon: BriefcaseIcon },
  { href: "/mensajes", label: "Mensajes", icon: ChatIcon },
];

const proItems: Item[] = [
  { href: "/pro", label: "Panel", icon: GridIcon, exact: true },
  { href: "/pro/mensajes", label: "Mensajes", icon: ChatIcon },
];

/** Barra de pestañas inferior, solo móvil. En desktop navega el header. */
export function BottomNav({ mode }: { mode: "cliente" | "pro" }) {
  const pathname = usePathname();

  // En el perfil del profesional la reemplaza la barra fija de contratación.
  if (pathname.startsWith("/profesionales/")) return null;

  const items = mode === "pro" ? proItems : clientItems;
  const activeColor = mode === "pro" ? "text-pro" : "text-cliente";
  const switchHref = mode === "pro" ? "/" : "/pro";
  const switchLabel = mode === "pro" ? "Cliente" : "Modo Pro";
  const switchColor = mode === "pro" ? "text-cliente" : "text-pro";

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={`grid ${items.length === 2 ? "grid-cols-3" : "grid-cols-5"}`}>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? activeColor : "text-slate-500"
              }`}
            >
              <Icon width={22} height={22} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}

        {/* Cambio de modo: el color del otro lado siempre indica "el otro lado" */}
        <Link
          href={switchHref}
          className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${switchColor}`}
        >
          <SwitchIcon width={22} height={22} />
          {switchLabel}
        </Link>
      </div>
    </nav>
  );
}
