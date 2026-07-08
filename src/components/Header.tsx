"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

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

export function Header({ mode }: { mode: "cliente" | "pro" }) {
  const pathname = usePathname();
  const nav = mode === "pro" ? proNav : clientNav;
  const activeCls =
    mode === "pro" ? "bg-pro-soft text-pro-dark" : "bg-cliente-soft text-cliente-dark";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      {/* Franja de color según el modo */}
      <div className={`h-1 ${mode === "pro" ? "bg-pro" : "bg-cliente"}`} />
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <Logo accent={mode} href={mode === "pro" ? "/pro" : "/"} className="mr-4 shrink-0" />

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

        {/* Cambio de modo: el otro color siempre indica "el otro lado" */}
        {mode === "pro" ? (
          <Link
            href="/"
            className="ml-auto shrink-0 rounded-xl bg-cliente px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-cliente-dark"
          >
            <span className="md:hidden">Modo Cliente</span>
            <span className="hidden md:inline">Buscar servicios</span>
          </Link>
        ) : (
          <Link
            href="/pro"
            className="ml-auto shrink-0 rounded-xl bg-pro px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-pro-dark"
          >
            <span className="md:hidden">Modo Pro</span>
            <span className="hidden md:inline">Ofrecé tus servicios</span>
          </Link>
        )}
      </div>
    </header>
  );
}
