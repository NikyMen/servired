import { StarIcon, VerifiedIcon } from "@/components/icons";
import { initials } from "@/lib/format";

/** Insignia de profesional verificado (check azul). */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span title="Profesional verificado" className={`inline-flex text-brand-blue ${className}`}>
      <VerifiedIcon width={18} height={18} />
    </span>
  );
}

/** Calificación con estrella. */
export function Rating({
  value,
  count,
  className = "",
}: {
  value: number;
  count?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <StarIcon width={15} height={15} className="text-amber-400" />
      <span className="font-semibold text-navy-900">{value.toFixed(1)}</span>
      {count != null && <span className="text-slate-400">({count})</span>}
    </span>
  );
}

/** Avatar generado a partir de iniciales (sin dependencia de red). */
export function Avatar({
  name,
  color = "#1B4DA0",
  size = 40,
  ring = false,
}: {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        ring ? "ring-2 ring-white" : ""
      }`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Botón reutilizable con variantes. */
export function Button({
  children,
  variant = "primary",
  className = "",
  href,
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "navy" | "outline" | "lime" | "ghost";
  className?: string;
  href?: string;
  type?: "button" | "submit";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: "bg-brand-blue text-white hover:bg-brand-blue/90",
    navy: "bg-navy-800 text-white hover:bg-navy-700",
    outline: "border border-slate-300 text-navy-900 hover:bg-slate-50",
    lime: "bg-lime text-navy-950 hover:bg-lime-dark font-semibold",
    ghost: "text-navy-900 hover:bg-slate-100",
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}

/** Etiqueta de estado (activo / pausado / completado). */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    activo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    completado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pausado: "bg-amber-50 text-amber-700 ring-amber-200",
    pendiente: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  const cls = map[status.toLowerCase()] ?? map.pendiente;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}
