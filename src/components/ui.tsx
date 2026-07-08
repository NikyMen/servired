import { StarIcon, VerifiedIcon } from "@/components/icons";
import { initials } from "@/lib/format";

/** Insignia de profesional verificado (check verde: el que ofrece). */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span title="Profesional verificado" className={`inline-flex text-pro ${className}`}>
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
      <span className="font-semibold text-slate-900">{value.toFixed(1)}</span>
      {count != null && <span className="text-slate-400">({count})</span>}
    </span>
  );
}

/** Avatar generado a partir de iniciales (sin dependencia de red). */
export function Avatar({
  name,
  color = "#059669",
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

/** Botón reutilizable. Azul = acción de cliente, verde = acción de profesional. */
export function Button({
  children,
  variant = "cliente",
  className = "",
  href,
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  variant?: "cliente" | "pro" | "outline";
  className?: string;
  href?: string;
  type?: "button" | "submit";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    cliente: "bg-cliente text-white hover:bg-cliente-dark",
    pro: "bg-pro text-white hover:bg-pro-dark",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
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

/** Etiqueta de estado. */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    solicitada: "bg-cliente-soft text-cliente-dark ring-blue-200",
    abierta: "bg-cliente-soft text-cliente-dark ring-blue-200",
    aceptada: "bg-pro-soft text-pro-dark ring-emerald-200",
    completada: "bg-pro-soft text-pro-dark ring-emerald-200",
    activo: "bg-pro-soft text-pro-dark ring-emerald-200",
    pausado: "bg-amber-50 text-amber-700 ring-amber-200",
    cancelada: "bg-slate-100 text-slate-500 ring-slate-200",
    cerrada: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const cls = map[status.toLowerCase()] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}
