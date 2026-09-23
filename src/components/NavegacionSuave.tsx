"use client";

import { createContext, useContext, useTransition, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Navegar = (href: string, opciones?: { irA?: string }) => void;

const Contexto = createContext<{ navegar: Navegar; cargando: boolean } | null>(null);

/**
 * Los filtros de la portada (categorías, Profesionales/Oficios) cambian la URL
 * sin recargar ni mover el scroll: la navegación va en una transición, así la
 * página vieja sigue en pantalla hasta que llega la nueva y se reemplaza de una.
 * Mientras tanto, lo envuelto en <Atenuable> baja un poco la opacidad.
 */
export function NavegacionSuave({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [cargando, startTransition] = useTransition();

  const navegar: Navegar = (href, opciones) => {
    startTransition(() => router.push(href, { scroll: false }));
    // Bajar hasta un ancla con desplazamiento suave, no con el salto del hash.
    if (opciones?.irA) document.getElementById(opciones.irA)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <Contexto.Provider value={{ navegar, cargando }}>{children}</Contexto.Provider>;
}

export function useNavegacionSuave() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useNavegacionSuave va dentro de <NavegacionSuave>.");
  return valor;
}

export function Atenuable({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { cargando } = useNavegacionSuave();
  return (
    <div aria-busy={cargando} className={`transition-opacity duration-300 ${cargando ? "opacity-50" : "opacity-100"} ${className}`}>
      {children}
    </div>
  );
}

/** Link que filtra la portada sin recargar; con href real para abrir en otra pestaña o para buscadores. */
export function EnlaceSuave({ href, irA, className, children, ...rest }: { href: string; irA?: string; className?: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const { navegar } = useNavegacionSuave();
  return (
    <a
      {...rest}
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navegar(href, { irA });
      }}
    >
      {children}
    </a>
  );
}
