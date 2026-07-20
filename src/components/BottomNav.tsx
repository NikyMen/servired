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
} from "@/components/icons";
import type { Mode } from "@/lib/types";

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
export function BottomNav({ mode }: { mode: Mode }) {
  const pathname = usePathname();

  // En el perfil del profesional la reemplaza la barra fija de contratación.
  if (pathname.startsWith("/profesionales/")) return null;

  const items = mode === "pro" ? proItems : clientItems;
  const activeColor = mode === "pro" ? "text-pro" : "text-cliente";

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* El cambio de modo ya no vive acá: lo hace el interruptor del header. */}
      <div className={`grid ${items.length === 2 ? "grid-cols-2" : "grid-cols-4"}`}>
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
      </div>
    </nav>
  );
}
