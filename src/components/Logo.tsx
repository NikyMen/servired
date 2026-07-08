import Link from "next/link";

export function Logo({
  href = "/",
  accent = "cliente",
  className = "",
}: {
  href?: string;
  accent?: "cliente" | "pro";
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-baseline leading-none ${className}`}>
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-slate-900">SERVI</span>
        <span className={accent === "pro" ? "text-pro" : "text-cliente"}>RED</span>
      </span>
      {accent === "pro" && (
        <span className="ml-1.5 rounded-md bg-pro px-1.5 py-0.5 text-[10px] font-bold text-white">
          PRO
        </span>
      )}
    </Link>
  );
}
