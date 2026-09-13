import Image from "next/image";
import Link from "next/link";
import type { Mode } from "@/lib/types";

/** Símbolo de ServiRed con fondo transparente. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      priority
      className={className}
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
  fluid = false,
}: {
  href?: string;
  accent?: Mode;
  className?: string;
  /** Alto del lockup en px; el ancho sale de la proporción. */
  height?: number;
  /** En pantallas chicas deja solo el símbolo: le hace lugar al interruptor. */
  compactOnMobile?: boolean;
  /**
   * El lockup se achica (manteniendo la proporción) si no le alcanza el lugar,
   * en vez de empujar a lo que tiene al lado a otra fila. Debajo de 340px,
   * donde ya no se leería, queda solo el símbolo.
   */
  fluid?: boolean;
}) {
  const width = Math.round(height * HORIZONTAL_RATIO);

  if (fluid) {
    return (
      <Link
        href={href}
        aria-label="ServiRed — inicio"
        className={`flex items-center leading-none ${className}`}
      >
        <LogoMark size={Math.min(height, 32)} className="min-[340px]:hidden" />
        <Image
          src="/logo-horizontal.png"
          alt="ServiRed — servicios profesionales conectados"
          width={width}
          height={height}
          priority
          className="hidden h-auto max-w-full min-[340px]:block"
          style={{ width }}
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label="ServiRed — inicio"
      className={`inline-flex items-center gap-2 leading-none ${className}`}
    >
      {compactOnMobile && <LogoMark size={height} className="sm:hidden" />}
      <Image
        src="/logo-horizontal.png"
        alt="ServiRed — servicios profesionales conectados"
        width={width}
        height={height}
        priority
        className={`${compactOnMobile ? "hidden sm:block" : "block"} max-w-[118px] sm:max-w-none`}
        style={{ width, height }}
      />
    </Link>
  );
}
