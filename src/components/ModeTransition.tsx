"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import type { Mode } from "@/lib/types";

/** Lo que dura la cortina. Tiene que coincidir con las animaciones mode-* de globals.css. */
const DURACION_MS = 820;

/**
 * ModeSwitch anuncia acá dónde fue el clic, antes de que Next navegue.
 * Es un CustomEvent y no una prop porque entre el interruptor (vive en cada
 * Header) y esta cortina (vive en el layout raíz) no hay un padre común
 * cómodo que no obligue a subir estado por media app.
 */
export const MODE_SWITCH_EVENT = "servired:mode-switch";

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
 * Una lámina de vidrio esmerilado barre la pantalla EN EL SENTIDO en el que te
 * movés: al lado que ofrece entra por la izquierda y sale por la derecha; al
 * que busca, al revés. En el medio se planta un instante — ahí pasa el cambio
 * de página, sin verse. La dirección la resuelve el CSS con --mode-dir a partir
 * de la clase de destino; los tiempos y la geometría están en globals.css.
 */
export function ModeTransition() {
  const pathname = usePathname();
  const mode = modeOf(pathname);

  const previous = useRef<Mode | null>(null);
  const [playing, setPlaying] = useState<Mode | null>(null);

  /** Cuándo fue el último clic en el interruptor. Sirve para no encimar una
      segunda cortina cuando la navegación de ese clic recién aterriza. */
  const clickedAt = useRef<number | null>(null);

  // El clic dispara el barrido YA, sin esperar a que la navegación aterrice.
  // Antes la cortina colgaba del cambio de pathname, y eso tenía un agujero:
  // sin sesión de pro, "Ofrezco" rebota a /entrar, el modo nunca cambia y no
  // se veía nada. El barrido igual cuenta la intención ("quisiste cruzar"), y si
  // hay que loguearse primero, aparece detrás de la cortina.
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const { to } = (e as CustomEvent<{ to: Mode }>).detail;
      clickedAt.current = Date.now();
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

    // Si hay un barrido de clic en el aire, este cambio de ruta es su
    // aterrizaje (o su rebote a /entrar): se registra el modo real y no se
    // encima otra cortina arriba de la que está sonando.
    if (clickedAt.current && Date.now() - clickedAt.current < DURACION_MS + ESPERA_MS) {
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

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-100 overflow-hidden ${
        isPro ? "mode-skin-pro" : "mode-skin-cliente"
      }`}
    >
      {/* Esmerilado. Va primero y sin fondo propio: lo que desenfoca es la
          página de atrás, no una capa de color. */}
      <div className="animate-mode-frost absolute inset-0" />

      {/* La lámina, con su filo luminoso adentro (viaja con ella). */}
      <div className="mode-pane animate-mode-sweep">
        <div className="mode-edge animate-mode-edge" />
      </div>

      <div className="animate-mode-badge absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
        <LogoMark size={56} className="drop-shadow-lg" />
        <span className="text-3xl font-extrabold tracking-tight">
          SERVI<span className={isPro ? "text-emerald-200" : "text-blue-200"}>RED</span>
        </span>
        <span className="glass glass-thin glass-dark rounded-full px-4 py-1.5 text-sm font-semibold">
          {isPro ? "Ofrecé tus servicios" : "Buscá profesionales"}
        </span>
      </div>
    </div>
  );
}
