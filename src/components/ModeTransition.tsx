"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import type { Mode } from "@/lib/types";

/** Lo que dura la cortina. Tiene que coincidir con las animaciones mode-* de globals.css. */
const DURACION_MS = 1600;

/**
 * ModeSwitch anuncia acá dónde fue el clic, antes de que Next navegue.
 * Es un CustomEvent y no una prop porque entre el interruptor (vive en cada
 * Header) y esta cortina (vive en el layout raíz) no hay un padre común
 * cómodo que no obligue a subir estado por media app.
 */
export const MODE_SWITCH_EVENT = "servired:mode-switch";

/** Ángulos de las chispas, en grados. Asimétricos a propósito: en abanico
    perfecto parecen un reloj. */
const SPARKS = [12, 64, 118, 176, 235, 305];

/**
 * Cuánto esperamos a que el modo se asiente antes de anunciarlo.
 * Sin esto, /pro sin sesión rebota a /entrar y se ven dos cortinas encadenadas:
 * la verde arranca y ~50ms después se reinicia en azul. Con la espera, el rebote
 * queda dentro de la ventana y no se anuncia nada.
 */
const ESPERA_MS = 120;

/** El modo sale de la ruta: /pro… es el lado que ofrece, el resto el que busca. */
function modeOf(pathname: string): Mode {
  return pathname.startsWith("/pro") ? "pro" : "cliente";
}

/**
 * Cortina de color al saltar de un lado al otro de la app.
 *
 * Vive en el layout raíz, que no se desmonta al navegar: por eso puede recordar
 * en qué modo estabas y detectar el cambio. Un componente dentro de cada layout
 * no serviría, porque se monta de cero en cada salto.
 *
 * Un disco de color cruza la pantalla hacia el lado que elegiste. Es un gradiente
 * radial, no una franja: el filo que avanza es un arco difuminado y nunca una
 * línea recta. La dirección la resuelve el CSS a partir de la clase de destino.
 * Los tiempos y la geometría de las capas están en globals.css.
 */
export function ModeTransition() {
  const pathname = usePathname();
  const mode = modeOf(pathname);

  const previous = useRef<Mode | null>(null);
  const [playing, setPlaying] = useState<Mode | null>(null);

  /** Último clic en el interruptor: de ahí nace la onda. Guarda también
      cuándo fue, para no usar un clic viejo si el modo cambió por URL. */
  const origin = useRef<{ x: number; y: number; at: number } | null>(null);

  // El clic dispara la onda YA, sin esperar a que la navegación aterrice.
  // Antes la cortina colgaba del cambio de pathname, y eso tenía un agujero:
  // sin sesión de pro, "Ofrezco" rebota a /entrar, el modo nunca cambia y no
  // se veía nada. La onda igual cuenta la intención ("quisiste cruzar"), y si
  // hay que loguearse primero, aparece detrás de la cortina.
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const { x, y, to } = (e as CustomEvent<{ x: number; y: number; to: Mode }>).detail;
      origin.current = { x, y, at: Date.now() };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // `previous` se adelanta al destino: cuando el pathname cambie de verdad,
      // el efecto de abajo no encuentra diferencia y no encima otra cortina.
      previous.current = to;
      setPlaying(to);
    };
    window.addEventListener(MODE_SWITCH_EVENT, onSwitch);
    return () => window.removeEventListener(MODE_SWITCH_EVENT, onSwitch);
  }, []);

  // Decide cuándo arrancar. Sólo eso: la vida de la cortina la lleva el efecto
  // de abajo, atado a `playing`. Si el desmontaje colgara de este efecto, un
  // cambio de modo de ida y vuelta cancelaría el temporizador sin poner otro y
  // la cortina quedaría clavada en pantalla.
  useEffect(() => {
    // Primera carga: no hay cambio que anunciar.
    if (previous.current === null) {
      previous.current = mode;
      return;
    }
    if (previous.current === mode) return;

    // Si hay una onda de clic en el aire, este cambio de ruta es su aterrizaje
    // (o su rebote a /entrar): se registra el modo real y no se encima otra
    // cortina arriba de la que está sonando.
    if (origin.current && Date.now() - origin.current.at < DURACION_MS + ESPERA_MS) {
      previous.current = mode;
      return;
    }

    // Quien pidió menos movimiento salta directo, sin cortina.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previous.current = mode;
      return;
    }

    // `previous` recién se mueve acá: si el modo rebota antes de que dispare,
    // el cleanup cancela y volvemos al estado anterior como si nada.
    const t = setTimeout(() => {
      previous.current = mode;
      setPlaying(mode);
    }, ESPERA_MS);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(null), DURACION_MS);
    return () => clearTimeout(t);
  }, [playing]);

  if (!playing) return null;

  const isPro = playing === "pro";

  // El clic vale si fue hace poco; si el modo cambió por otra vía (URL,
  // botón de atrás), la onda nace donde vive el interruptor: arriba a la
  // derecha del header.
  const o = origin.current;
  const fresh = o && Date.now() - o.at < DURACION_MS;
  const originStyle = {
    "--mode-x": fresh ? `${o.x}px` : "88%",
    "--mode-y": fresh ? `${o.y}px` : "28px",
  } as React.CSSProperties;

  return (
    <div
      aria-hidden
      style={originStyle}
      className={`pointer-events-none fixed inset-0 z-100 overflow-hidden ${
        isPro ? "mode-skin-pro" : "mode-skin-cliente"
      }`}
    >
      {/* Vidrio. Va primero y sin fondo: lo que desenfoca es la página de atrás. */}
      <div className="animate-mode-veil absolute inset-0" />

      {/* El eco claro corre adelante; la onda de color lo alcanza y tapa.
          El orden importa: la onda pisa al eco salvo en el filo que avanza. */}
      <div className="mode-wave-echo animate-mode-wave-echo absolute inset-0" />
      <div className="mode-wave animate-mode-wave absolute inset-0" />

      {/* El toque: anillo de choque y chispas naciendo del punto del clic. */}
      <div className="mode-ring animate-mode-ring" />
      {SPARKS.map((deg) => (
        <div
          key={deg}
          className="mode-spark animate-mode-spark"
          style={{ "--a": `${deg}deg` } as React.CSSProperties}
        />
      ))}

      <div className="animate-mode-badge absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
        <LogoMark size={56} className="drop-shadow-lg" />
        <span className="text-3xl font-extrabold tracking-tight">
          SERVI<span className={isPro ? "text-emerald-200" : "text-blue-200"}>RED</span>
        </span>
        <span className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-sm font-semibold">
          {isPro ? "Ofrecé tus servicios" : "Buscá profesionales"}
        </span>
      </div>
    </div>
  );
}
