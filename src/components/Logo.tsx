import Image from "next/image";
import Link from "next/link";
import type { Mode } from "@/lib/types";

/**
 * Símbolo de ServiRed: el nudo. Va sobre un círculo blanco porque el archivo
 * es un JPG recortado sin transparencia, y así queda prolijo sobre cualquier fondo.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      priority
      className={`rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Proporción del lockup horizontal ya recortado (1023x276). */
const HORIZONTAL_RATIO = 1023 / 276;

export function Logo({
  href = "/",
  accent = "cliente",
  className = "",
  height = 34,
  compactOnMobile = false,
}: {
  href?: string;
  accent?: Mode;
  className?: string;
  /** Alto del lockup en px; el ancho sale de la proporción. */
  height?: number;
  /** En pantallas chicas deja solo el símbolo: le hace lugar al interruptor. */
  compactOnMobile?: boolean;
}) {
  const width = Math.round(height * HORIZONTAL_RATIO);

  return (
    <Link
      href={href}
      aria-label="ServiRed — inicio"
      className={`inline-flex items-center gap-2 leading-none ${className}`}
    >
      {compactOnMobile && <LogoMark size={height} className="shrink-0 sm:hidden" />}
      <Image
        src="/logo-horizontal.png"
        alt="ServiRed — servicios profesionales conectados"
        width={width}
        height={height}
        priority
        className={compactOnMobile ? "hidden sm:block" : "block"}
        style={{ width, height }}
      />
      {accent === "pro" && (
        <span className="rounded-md bg-pro px-1.5 py-0.5 text-[10px] font-bold text-white">
          PRO
        </span>
      )}
    </Link>
  );
}
