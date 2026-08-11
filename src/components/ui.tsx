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

/**
 * Avatar: la foto de la persona si la subió, y si no las iniciales sobre su
 * color. Que el fallback no dependa de la red es lo que deja que el perfil se
 * vea completo desde el minuto cero, antes de que nadie suba nada.
 */
export function Avatar({
  name,
  color = "#059669",
  size = 40,
  ring = false,
  src,
}: {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
  src?: string | null;
}) {
  const box = ring ? "ring-2 ring-white" : "";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`inline-block shrink-0 rounded-full object-cover ${box}`}
        style={{ width: size, height: size, backgroundColor: color }}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${box}`}
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

/**
 * Botón reutilizable.
 *
 * El color ya no se elige acá: `.glass-btn` se pinta con `--accent`, que lo
 * define el `data-modo` del layout. O sea que en el lado cliente sale azul y
 * en el profesional verde sin pasarle nada. `variant` sólo queda para forzar
 * un lado contra el ambiente (p. ej. un CTA verde en una página azul) y para
 * el secundario de vidrio.
 */
export function Button({
  children,
  variant = "accent",
  className = "",
  href,
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  variant?: "accent" | "cliente" | "pro" | "outline";
  className?: string;
  href?: string;
  type?: "button" | "submit";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    accent: "",
    cliente: "[--accent-rgb:37_99_235] [--accent-dark:var(--color-cliente-dark)]",
    pro: "[--accent-rgb:5_150_105] [--accent-dark:var(--color-pro-dark)]",
    outline: "glass-btn-ghost",
  };
  const cls = `glass-btn px-4 py-2.5 text-sm ${variants[variant]} ${className}`;

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
  // Vidrio teñido: el color va en el fondo translúcido y en el aro, así la
  // píldora sigue dejando pasar lo que tiene atrás como el resto de la app.
  const blue = "bg-blue-500/12 text-cliente-dark ring-blue-400/30";
  const green = "bg-emerald-500/12 text-pro-dark ring-emerald-400/30";
  const amber = "bg-amber-400/15 text-amber-700 ring-amber-400/35";
  const grey = "bg-slate-400/12 text-slate-500 ring-slate-400/25";
  const map: Record<string, string> = {
    solicitada: blue,
    presupuestada: amber,
    abierta: blue,
    aceptada: green,
    completada: green,
    activo: green,
    pausado: amber,
    cancelada: grey,
    cerrada: grey,
  };
  const cls = map[status.toLowerCase()] ?? grey;
  const labels: Record<string, string> = {
    solicitada: "Pendiente",
    presupuestada: "Presupuesto enviado",
    aceptada: "Aceptada",
    completada: "Completada",
    cancelada: "Rechazada",
    abierta: "Abierta",
    cerrada: "Cerrada",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset backdrop-blur-sm ${cls}`}
    >
      {labels[status.toLowerCase()] ?? status}
    </span>
  );
}
