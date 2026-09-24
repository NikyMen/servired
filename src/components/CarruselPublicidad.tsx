"use client";

import { useEffect, useRef } from "react";
import { AdPlate } from "@/components/AdPlate";

type Ad = { slot: string; title: string; imageUrl: string | null; whatsappPhone: string | null; whatsappMessage: string | null; enabled: boolean };
/** ad null = lugar libre: invita a publicitar (hace falta invitarHref). */
export type ItemCarrusel = { key: string; ad: Ad | null; label: string };

/** Velocidad del movimiento solo, en px por segundo. */
const VELOCIDAD = 30;
/** Después de soltarlo (y de que frene el envión), espera esto y vuelve a andar solo. */
const PAUSA_MS = 2000;
/** Placas por vuelta como mínimo: con menos, la lista se repite para llenar la pantalla. */
const MINIMO_POR_VUELTA = 6;
/** Cuánto del envión queda después de un segundo (el resto lo frena el roce). */
const ROCE = 0.05;
/** Envión máximo al soltar, en px por segundo. */
const ENVION_MAX = 3000;
/** Hasta este desplazamiento del dedo es un toque (abre la placa), no un arrastre. */
const UMBRAL_ARRASTRE = 6;

/**
 * Una fila de publicidad del celular que no termina nunca. Anda sola hacia su
 * lado y se puede agarrar: frenarla, arrastrarla o revolearla para cualquier
 * lado (sigue girando por el envión). Dos segundos después de soltarla vuelve
 * a andar sola.
 *
 * La pista lleva la vuelta dos veces; el corrimiento se mantiene dentro del
 * ancho de una vuelta, así el salto de vuelta al principio no se ve. Se mueve
 * con un transform desde requestAnimationFrame (sin re-render por cuadro).
 * Quien pidió menos movimiento la ve quieta, pero la puede arrastrar igual.
 */
export function CarruselPublicidad({ titulo, tono, sentido, items, invitarHref = null }: { titulo: string; tono: string; sentido: "izquierda" | "derecha"; items: ItemCarrusel[]; invitarHref?: string | null }) {
  const caja = useRef<HTMLDivElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const vuelta = useRef<HTMLDivElement>(null);

  // Con pocas placas la vuelta repite la lista, si no quedaría pantalla vacía.
  const repeticiones = Math.max(1, Math.ceil(MINIMO_POR_VUELTA / Math.max(items.length, 1)));
  const base = Array.from({ length: repeticiones }, (_, r) => items.map((item) => ({ ...item, r }))).flat();

  useEffect(() => {
    const cajaEl = caja.current;
    const pistaEl = pista.current;
    const vueltaEl = vuelta.current;
    if (!cajaEl || !pistaEl || !vueltaEl) return;

    const quieta = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hacia = sentido === "derecha" ? 1 : -1;
    let ancho = vueltaEl.offsetWidth;
    let corrido = 0;
    let envion = 0;
    let pausaHasta = 0;
    let agarrado = false;
    let arrastrado = false;
    let inicioX = 0;
    let ultimoX = 0;
    let ultimoT = 0;
    let antes = performance.now();
    let cuadro = 0;

    // Siempre dentro de (-ancho, 0]: la segunda vuelta tapa el hueco.
    const envolver = () => {
      if (ancho > 0) corrido = ((corrido % ancho) - ancho) % ancho;
    };
    const pintar = () => {
      pistaEl.style.transform = `translate3d(${corrido}px, 0, 0)`;
    };

    const andar = (ahora: number) => {
      // Tope por si la pestaña estuvo en segundo plano: que no pegue un salto.
      const dt = Math.min(0.05, (ahora - antes) / 1000);
      antes = ahora;
      if (!agarrado) {
        if (Math.abs(envion) > 5) {
          corrido += envion * dt;
          envion *= Math.pow(ROCE, dt);
          pausaHasta = ahora + PAUSA_MS;
        } else {
          envion = 0;
          if (!quieta && ahora >= pausaHasta) corrido += hacia * VELOCIDAD * dt;
        }
        envolver();
        pintar();
      }
      cuadro = requestAnimationFrame(andar);
    };

    const agarrar = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      agarrado = true;
      arrastrado = false;
      envion = 0;
      inicioX = ultimoX = e.clientX;
      ultimoT = e.timeStamp;
    };
    const mover = (e: PointerEvent) => {
      if (!agarrado) return;
      if (!arrastrado) {
        if (Math.abs(e.clientX - inicioX) <= UMBRAL_ARRASTRE) return;
        // Recién acá se captura: capturar al tocar le robaría el clic a la placa.
        arrastrado = true;
        try {
          cajaEl.setPointerCapture(e.pointerId);
        } catch {
          // El puntero ya no está activo: se sigue arrastrando sin capturarlo.
        }
      }
      const dx = e.clientX - ultimoX;
      const dt = (e.timeStamp - ultimoT) / 1000;
      corrido += dx;
      envolver();
      pintar();
      if (dt > 0) envion = 0.7 * envion + 0.3 * (dx / dt);
      ultimoX = e.clientX;
      ultimoT = e.timeStamp;
    };
    const soltar = (e: PointerEvent) => {
      if (!agarrado) return;
      agarrado = false;
      // Si lo tuvo quieto antes de soltar, no hay envión.
      envion = arrastrado && e.timeStamp - ultimoT < 100 ? Math.max(-ENVION_MAX, Math.min(ENVION_MAX, envion)) : 0;
      // Con el reloj de los cuadros (el mismo que compara andar()).
      pausaHasta = antes + PAUSA_MS;
    };
    // Después de arrastrar, soltar sobre una placa no la abre.
    const clic = (e: MouseEvent) => {
      if (!arrastrado) return;
      e.preventDefault();
      e.stopPropagation();
      arrastrado = false;
    };
    const noArrastrarImagen = (e: DragEvent) => e.preventDefault();

    cajaEl.addEventListener("pointerdown", agarrar);
    cajaEl.addEventListener("pointermove", mover);
    cajaEl.addEventListener("pointerup", soltar);
    cajaEl.addEventListener("pointercancel", soltar);
    cajaEl.addEventListener("click", clic, true);
    cajaEl.addEventListener("dragstart", noArrastrarImagen);
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      ancho = vueltaEl.offsetWidth;
      envolver();
      pintar();
    });
    observador?.observe(vueltaEl);
    cuadro = requestAnimationFrame(andar);

    return () => {
      cancelAnimationFrame(cuadro);
      observador?.disconnect();
      cajaEl.removeEventListener("pointerdown", agarrar);
      cajaEl.removeEventListener("pointermove", mover);
      cajaEl.removeEventListener("pointerup", soltar);
      cajaEl.removeEventListener("pointercancel", soltar);
      cajaEl.removeEventListener("click", clic, true);
      cajaEl.removeEventListener("dragstart", noArrastrarImagen);
    };
  }, [sentido, base.length]);

  if (!items.length) return null;

  const placas = (copia: boolean) =>
    base.map((item, i) => {
      // El lector ve cada placa una sola vez; las repeticiones son para el ojo
      // (sin inert: la copia que pasa por delante también se puede tocar).
      const repetida = copia || item.r > 0;
      return (
        // pr en vez de gap: así cada vuelta mide exacto la mitad de la pista.
        <div key={`${copia ? "b" : "a"}-${i}-${item.key}`} aria-hidden={repetida || undefined} className="w-[30vw] max-w-40 shrink-0 pr-2">
          <AdPlate ad={item.ad} label={item.label} className="rounded-2xl" invitarHref={invitarHref} />
        </div>
      );
    });

  return (
    <section aria-label={`Publicidad de ${titulo.toLowerCase()}`} className="space-y-1.5">
      <p className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase ${tono}`}>{titulo}</p>
      <div
        ref={caja}
        // pan-y: el scroll de la página sigue siendo del dedo; lo horizontal es del carrusel.
        className="-mx-4 cursor-grab touch-pan-y overflow-hidden select-none [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] active:cursor-grabbing"
      >
        <div ref={pista} className="flex w-max will-change-transform">
          <div ref={vuelta} className="flex">{placas(false)}</div>
          <div className="flex">{placas(true)}</div>
        </div>
      </div>
    </section>
  );
}
