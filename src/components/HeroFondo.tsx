"use client";

import { useState } from "react";
import { WelderScene } from "@/components/WelderScene";
import { FondoLiquido } from "@/components/FondoLiquido";

/** Dónde va la foto del hero. Un solo lugar: si cambia el archivo, cambia acá. */
export const HERO_FOTO = "/servired-panel-entrada.png";

/**
 * El fondo del banner de inicio.
 *
 * Manda la foto real. Si el archivo no está, el <img> falla, y recién ahí se
 * monta <WelderScene> y dibuja la escena en canvas. Antes esto se resolvía con
 * un background-image de CSS, que degradaba solo pero tenía un costo tonto: el
 * canvas seguía animando debajo de una foto opaca, quemando batería para
 * pintar algo que nadie ve. Con el estado explícito, o corre uno o corre el
 * otro — nunca los dos.
 *
 * `probando` es el primer render: no se dibuja ninguno de los dos y se ve el
 * degradé de respaldo de .hero-weld. Dura lo que tarda una imagen del mismo
 * origen, y evita el parpadeo de ver el soldador dibujado antes de la foto.
 */
export function HeroFondo() {
  const [foto, setFoto] = useState<"probando" | "ok" | "falta">("probando");

  return (
    <div className="hero-weld-scene" aria-hidden>
      {foto === "falta" && <WelderScene />}

      {/* <img> y no next/image: es una foto de fondo decorativa, va a cover y
          necesitamos onError para saber si existe, que next/image no expone
          igual. alt vacío porque no aporta nada que no diga el título. */}
      {foto !== "falta" && (
        <img
          src={HERO_FOTO}
          alt=""
          className="hero-weld-photo"
          // Es lo más grande del primer pantallazo, o sea el LCP: que el
          // navegador no la deje atrás de los chunks de JS.
          fetchPriority="high"
          decoding="async"
          onLoad={() => setFoto("ok")}
          onError={() => setFoto("falta")}
        />
      )}

      {/* Va después de la foto a propósito: comparten z-index y el orden del
          DOM es lo que lo deja encima (ver .hero-weld-liquid en globals.css). */}
      <FondoLiquido className="hero-weld-liquid" variante="portada" />

      <div className="hero-weld-veil" />
      <div className="hero-weld-grain" />
    </div>
  );
}
