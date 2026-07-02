"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CompassIcon,
  ClipboardIcon,
  BriefcaseIcon,
  HeartIcon,
  ChatIcon,
  WalletIcon,
  UserIcon,
  HelpIcon,
  HeadsetIcon,
} from "@/components/icons";

const nav = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/buscar", label: "Explorar servicios", icon: CompassIcon },
  { href: "/solicitudes", label: "Mis solicitudes", icon: ClipboardIcon },
  { href: "/mis-contrataciones", label: "Mis contrataciones", icon: BriefcaseIcon },
  { href: "/favoritos", label: "Favoritos", icon: HeartIcon },
  { href: "/mensajes", label: "Mensajes", icon: ChatIcon },
  { href: "/pagos", label: "Pagos y facturas", icon: WalletIcon },
  { href: "/mi-perfil", label: "Mi perfil", icon: UserIcon },
];

export function ClientSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <nav className="space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
              }`}
            >
              <Icon width={20} height={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* CTA profesional */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="font-semibold text-navy-900">¿Sos profesional?</p>
        <p className="mt-1 text-sm text-slate-500">
          Unite a ServiRed y conseguí nuevos clientes hoy.
        </p>
        <Link
          href="/panel"
          className="mt-3 block rounded-xl bg-brand-blue py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
        >
          Crear mi perfil
        </Link>
        <Link
          href="/panel"
          className="mt-2 block text-center text-sm font-medium text-brand-blue hover:underline"
        >
          Conocé más
        </Link>
      </div>

      {/* Ayuda */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="font-semibold text-navy-900">¿Necesitás ayuda?</p>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <a href="#" className="flex items-center gap-2 hover:text-navy-900">
            <HelpIcon width={18} height={18} /> Centro de ayuda
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-navy-900">
            <HeadsetIcon width={18} height={18} /> Soporte 24/7
          </a>
        </div>
      </div>
    </aside>
  );
}
