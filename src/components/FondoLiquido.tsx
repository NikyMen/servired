"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CLIENT_BLUE, PRO_GREEN } from "@/lib/brand";

/**
 * El fluido de fondo, con las decisiones de este proyecto ya tomadas.
 *
 * Envuelve a <LiquidEther> por tres motivos:
 *
 * 1. three pesa. Con `ssr: false` queda en su propio chunk y se baja después de
 *    la hidratación, en vez de sumarse al JS que bloquea la primera pintura de
 *    la home.
 * 2. Las paletas son constantes de módulo. Si se pasara un array literal, cada
 *    render armaría uno nuevo, el efecto de LiquidEther lo vería como cambio y
 *    reconstruiría el contexto WebGL entero.
 * 3. Nadie que pidió menos movimiento se merece una simulación de fluido
 *    corriendo atrás del texto.
 */
const LiquidEther = dynamic(() => import("@/components/LiquidEther"), { ssr: false });

/** Los dos lados de ServiRed, con el celeste del arco en el medio. */
const PALETA_MARCA = [CLIENT_BLUE, "#38bdf8", PRO_GREEN];

/** En la portada el fluido va sobre una foto oscura: conviene más contraste. */
const PALETA_PORTADA = ["#1d4ed8", "#38bdf8", "#34d399"];

export type FondoLiquidoProps = {
  className?: string;
  /** `portada` es más tranquilo; `marca` mueve un poco más. */
  variante?: "portada" | "marca";
};

export function FondoLiquido({ className = "", variante = "marca" }: FondoLiquidoProps) {
  const esPortada = variante === "portada";
  const [animar, setAnimar] = useState(false);

  // Arranca apagado y se prende sólo si el sistema no pidió menos movimiento.
  // Al revés (arrancar prendido y apagar) el fluido alcanzaría a aparecer un
  // frame, que es justo lo que la preferencia quiere evitar.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setAnimar(!mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  if (!animar) return null;

  return (
    // aria-hidden: es decoración. Nada de lo que pasa acá cambia lo que dice
    // la página, y un canvas suelto en el árbol sólo estorba al lector.
    <div className={className} aria-hidden>
      <LiquidEther
        colors={esPortada ? PALETA_PORTADA : PALETA_MARCA}
        // Resolución baja: el fluido va difuminado atrás de un velo, nadie le
        // va a contar los píxeles, y así entra cómodo en un celular.
        resolution={0.35}
        mouseForce={esPortada ? 14 : 18}
        cursorSize={esPortada ? 90 : 110}
        autoDemo
        autoSpeed={esPortada ? 0.32 : 0.42}
        autoIntensity={esPortada ? 1.6 : 2.0}
        autoResumeDelay={2500}
      />
    </div>
  );
}
