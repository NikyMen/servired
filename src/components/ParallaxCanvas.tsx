"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; radius: number; speed: number; alpha: number };

const particles: Particle[] = Array.from({ length: 34 }, (_, index) => ({
  x: ((index * 37) % 100) / 100,
  y: ((index * 61 + 13) % 100) / 100,
  radius: 1 + (index % 3) * 0.7,
  speed: 0.12 + (index % 5) * 0.025,
  alpha: 0.18 + (index % 4) * 0.08,
}));

/** Fondo liviano: red de partículas que cambia con el scroll y el cursor. */
export function ParallaxCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvas: HTMLCanvasElement = canvasElement;
    const contextElement = canvas.getContext("2d");
    if (!contextElement) return;
    const context: CanvasRenderingContext2D = contextElement;

    let width = 0;
    let height = 0;
    let scroll = 0;
    let pointerX = 0.72;
    let pointerY = 0.25;
    let frame = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const drift = scroll * 0.1;
      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(
        width * pointerX,
        height * pointerY - drift * 0.25,
        0,
        width * pointerX,
        height * pointerY - drift * 0.25,
        Math.max(width, height) * 0.7
      );
      glow.addColorStop(0, "rgba(56, 189, 248, .2)");
      glow.addColorStop(0.45, "rgba(37, 99, 235, .08)");
      glow.addColorStop(1, "rgba(15, 23, 42, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(186, 230, 253, .12)";
      context.lineWidth = 1;
      const grid = 54;
      const gridOffset = (drift * 0.55) % grid;
      for (let x = -grid + gridOffset; x < width + grid; x += grid) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + drift * 0.12, height);
        context.stroke();
      }
      for (let y = -grid + gridOffset; y < height + grid; y += grid) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y + drift * 0.08);
        context.stroke();
      }

      for (const particle of particles) {
        const x = (particle.x * width + pointerX * 24 * particle.speed) % width;
        const y = (particle.y * height - drift * particle.speed) % height;
        const visibleY = y < 0 ? y + height : y;
        context.beginPath();
        context.arc(x, visibleY, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(224, 242, 254, ${particle.alpha})`;
        context.fill();
      }

      frame = requestAnimationFrame(draw);
    }

    const onScroll = () => {
      scroll = window.scrollY;
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(window.innerWidth, 1);
      pointerY = event.clientY / Math.max(window.innerHeight, 1);
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
