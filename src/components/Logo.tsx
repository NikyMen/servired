import Link from "next/link";

export function Logo({
  withTagline = false,
  className = "",
  light = false,
}: {
  withTagline?: boolean;
  className?: string;
  light?: boolean;
}) {
  return (
    <Link href="/" className={`inline-flex flex-col leading-none ${className}`}>
      <span className="text-2xl font-extrabold tracking-tight">
        <span className={light ? "text-white" : "text-navy-900"}>SERVI</span>
        <span className="text-brandred">RED</span>
      </span>
      {withTagline && (
        <span className={`mt-0.5 text-[10px] font-medium ${light ? "text-white/70" : "text-slate-500"}`}>
          Conectamos servicios, generamos confianza.
        </span>
      )}
    </Link>
  );
}
