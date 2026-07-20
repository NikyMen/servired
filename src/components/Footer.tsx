import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FacebookIcon } from "@/components/icons";
import { FACEBOOK_URL } from "@/lib/links";
import type { Mode } from "@/lib/types";

const clientLinks = [
  { href: "/", label: "Buscar profesionales" },
  { href: "/publicar-solicitud", label: "Publicar una solicitud" },
  { href: "/contrataciones", label: "Mis contrataciones" },
  { href: "/mensajes", label: "Mensajes" },
];

const proLinks = [
  { href: "/pro", label: "Panel" },
  { href: "/pro/mensajes", label: "Mensajes" },
  { href: "/preinscripcion", label: "Preinscripción" },
];

export function Footer({ mode }: { mode: Mode }) {
  const isPro = mode === "pro";
  const links = isPro ? proLinks : clientLinks;

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/70">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 pb-28 sm:grid-cols-2 md:grid-cols-3 md:pb-10">
        <div className="space-y-3">
          <Logo accent={mode} href={isPro ? "/pro" : "/"} />
          <p className="max-w-xs text-sm text-slate-500">
            Conectamos personas con profesionales verificados. Buscá, contratá y
            coordiná todo por mensaje.
          </p>
        </div>

        <nav className="space-y-2">
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
            {isPro ? "Tu trabajo" : "Servicios"}
          </p>
          <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-2">
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Seguinos</p>
          <FacebookLink
            className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors ${
              isPro ? "hover:border-pro hover:text-pro" : "hover:border-cliente hover:text-cliente"
            }`}
          >
            <FacebookIcon width={20} height={20} className="text-[#1877F2]" />
            ServiRed en Facebook
          </FacebookLink>
          <p className="text-xs text-slate-400">
            Novedades, zonas nuevas y profesionales destacados.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} ServiRed. Todos los derechos reservados.</p>
          <p>Hecho en Argentina 🇦🇷</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Link a la página de Facebook. Sale del dominio, así que:
 * - target _blank para no perder el sitio,
 * - rel noopener/noreferrer: sin noopener la pestaña nueva puede tocar window.opener.
 */
export function FacebookLink({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={FACEBOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="ServiRed en Facebook (se abre en una pestaña nueva)"
      className={className}
    >
      {children}
    </a>
  );
}
