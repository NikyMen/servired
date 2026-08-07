"use client";

import { useEffect, useRef } from "react";

/* ============================================================
   ESCENA DEL SOLDADOR

   Un soldador arrodillado sobre una viga, de noche, en un taller.
   Está dibujada en canvas, no es una foto — pero la dirección de
   arte es la de una foto de soldadura real, que es justamente la
   más fácil de imitar: el arco es tan brillante que TODO lo demás
   queda en silueta. No hay caras, ni telas, ni texturas que el ojo
   pueda auditar; hay un contraluz brutal, un contorno de luz sobre
   el cuerpo y chispas. Eso es lo que se lee como fotográfico.

   Lo que hace el truco, en orden de importancia:
   1. El CONTORNO DE LUZ. La silueta se dibuja dos veces: primero
      una copia brillante corrida unos píxeles hacia el arco, y
      encima la copia negra en su lugar. Lo que sobresale de la
      copia brillante es una medialuna de luz sobre el lado que
      mira al arco. Es como se ilumina de verdad un contraluz.
   2. Las CHISPAS son segmentos, no puntos: se dibuja la línea de
      donde estaba a donde está. Eso es motion blur gratis, y es la
      diferencia entre "chispas" y "confeti".
   3. El PARPADEO irregular. Un arco eléctrico no late a ritmo fijo:
      se apaga a tirones. Cuatro senos incoherentes + caídas al azar.
   4. El HUMO iluminado desde abajo y el bokeh en primer plano, que
      es lo que agrega profundidad de campo.

   Rendimiento: la geometría (soldador, viga, taller) es estática, así
   que se pinta UNA vez en canvas fuera de pantalla y por frame sólo
   se hacen drawImage + partículas. Se congela si la pestaña no se ve.
   ============================================================ */

type Spark = {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  /** Cuántos rebotes le quedan contra el piso antes de apagarse. */
  bounces: number;
};

type Puff = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  /** 0 = pasa por detrás del soldador, 1 = por delante. */
  front: number;
};

/** Ruido determinista: mismo n, mismo valor. Para que el parpadeo no
 *  cambie dentro de un frame y se pueda repetir. */
function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Cuánto brilla el arco en el milisegundo t. Devuelve ~0.15 a ~1.25.
 *  Cuatro senos de períodos que no son múltiplos entre sí (por eso
 *  nunca se repite el patrón) más caídas bruscas cada ~60 ms, que es
 *  el tartamudeo del electrodo. */
function arcLevel(t: number) {
  const base =
    0.66 +
    0.17 * Math.sin(t * 0.047) +
    0.11 * Math.sin(t * 0.113 + 1.7) +
    0.08 * Math.sin(t * 0.29 + 0.4) +
    0.06 * Math.sin(t * 0.61 + 2.2);

  // Caída: de a ratos el arco se corta y la escena queda casi negra.
  const step = Math.floor(t / 58);
  const r = hash(step);
  const dip = r < 0.1 ? 0.28 + r : r < 0.2 ? 0.7 + r : 1;

  // Chisporroteo fino sobre la caída, con su propio ritmo.
  const grit = 0.9 + 0.2 * hash(step * 3.7 + 11);

  return Math.min(1.25, Math.max(0.15, base * dip * grit));
}

export function WelderScene({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // El rebote por una variable tipada es para que el narrowing sobreviva
    // dentro de las funciones de abajo: TS pierde el narrowing al capturar.
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvas: HTMLCanvasElement = canvasElement;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    /** Escala de la escena. Todas las medidas del dibujo están en
     *  "unidades de soldador" y se multiplican por esto. */
    let k = 1;
    /** Punta del electrodo: el origen de todo el sistema de coordenadas
     *  y el centro de toda la luz de la escena. */
    let arcX = 0;
    let arcY = 0;

    /** Capas estáticas: se repintan sólo al cambiar de tamaño. */
    let far: HTMLCanvasElement | null = null;
    let near: HTMLCanvasElement | null = null;
    let nearLit: HTMLCanvasElement | null = null;

    const sparks: Spark[] = [];
    const puffs: Puff[] = [];
    let frameId = 0;
    let running = true;
    let last = 0;

    /* ---------------------------------------------------------
       GEOMETRÍA
       Todo se dibuja relativo a la punta del electrodo: X() y Y()
       convierten unidades de soldador a píxeles. El soldador está
       de rodillas a la derecha del arco, inclinado hacia él.
       --------------------------------------------------------- */
    const X = (u: number) => arcX + u * k;
    const Y = (v: number) => arcY + v * k;
    const W = (u: number) => u * k;

    /** Piso, en unidades. El arco pasa apenas por encima de la viga. */
    const FLOOR = 40;

    /** Traza una extremidad como polilínea gruesa de puntas redondas.
     *  Con el ancho correcto una polilínea se lee como brazo o pierna;
     *  no hace falta modelar el volumen. */
    function limb(g: CanvasRenderingContext2D, pts: number[][], w: number) {
      g.lineWidth = W(w);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i < pts.length; i++) g.lineTo(X(pts[i][0]), Y(pts[i][1]));
      g.stroke();
    }

    /** El taller que se adivina detrás: pared, banco, garrafa, cadena.
     *  Va mucho más apagado que el soldador — la perspectiva aérea es
     *  lo que separa el fondo del primer plano. */
    function paintFar(g: CanvasRenderingContext2D) {
      g.fillStyle = "#0c1522";
      g.strokeStyle = "#0c1522";

      // Pared del fondo con paneles.
      g.fillRect(0, 0, width, Y(FLOOR - 6));
      g.fillStyle = "#101c2e";
      for (let i = 0; i < 7; i++) {
        const x = (width / 6) * i - W(30);
        g.fillRect(x, Y(-330), W(3), Y(FLOOR - 6) - Y(-330));
      }

      // Banco de trabajo a la izquierda, en sombra.
      g.fillStyle = "#0a1220";
      g.fillRect(X(-520), Y(-120), W(300), W(16));
      g.fillRect(X(-500), Y(-104), W(12), W(146));
      g.fillRect(X(-260), Y(-104), W(12), W(146));

      // Garrafa de gas apoyada contra la pared, a la derecha.
      g.beginPath();
      g.moveTo(X(330), Y(FLOOR));
      g.lineTo(X(330), Y(-170));
      g.quadraticCurveTo(X(330), Y(-205), X(358), Y(-208));
      g.quadraticCurveTo(X(386), Y(-205), X(386), Y(-170));
      g.lineTo(X(386), Y(FLOOR));
      g.closePath();
      g.fill();
      g.fillRect(X(350), Y(-232), W(16), W(26));

      // Cadena colgando del techo: una sucesión de eslabones que se
      // achican con la distancia.
      g.strokeStyle = "#0a1220";
      g.lineWidth = W(4);
      for (let i = 0; i < 16; i++) {
        g.beginPath();
        g.ellipse(X(258 + i * 0.6), Y(-360 + i * 12), W(4), W(7), 0, 0, Math.PI * 2);
        g.stroke();
      }

      // Piso: un plano apenas más claro que la pared.
      const floorGrad = g.createLinearGradient(0, Y(FLOOR - 6), 0, height);
      floorGrad.addColorStop(0, "#0a1220");
      floorGrad.addColorStop(1, "#060b14");
      g.fillStyle = floorGrad;
      g.fillRect(0, Y(FLOOR - 6), width, height - Y(FLOOR - 6));
    }

    /** El soldador, la viga y el soplete: la silueta de primer plano.
     *  Se pinta con un color plano; el volumen lo va a poner después
     *  el contorno de luz. */
    function paintNear(g: CanvasRenderingContext2D) {
      const INK = "#05080f";
      g.fillStyle = INK;
      g.strokeStyle = INK;

      // --- La viga sobre la que suelda (perfil doble T) ---
      g.fillRect(X(-300), Y(6), W(380), W(9)); // ala superior
      g.fillRect(X(-270), Y(15), W(320), W(16)); // alma
      g.fillRect(X(-300), Y(31), W(380), W(9)); // ala inferior
      // Caballete que la sostiene.
      limb(g, [[-190, 40], [-215, 96]], 9);
      limb(g, [[-190, 40], [-165, 96]], 9);

      // --- Pierna de adelante: pie plantado, rodilla alta ---
      limb(g, [[168, -92], [92, -46], [86, 16]], 30);
      // Bota.
      g.beginPath();
      g.moveTo(X(72), Y(4));
      g.lineTo(X(104), Y(4));
      g.lineTo(X(108), Y(34));
      g.quadraticCurveTo(X(84), Y(42), X(44), Y(38));
      g.quadraticCurveTo(X(44), Y(18), X(72), Y(4));
      g.closePath();
      g.fill();

      // --- Pierna de atrás: rodilla en el piso ---
      limb(g, [[196, -88], [206, 20], [258, 30]], 30);
      g.beginPath();
      g.moveTo(X(240), Y(14));
      g.lineTo(X(280), Y(20));
      g.quadraticCurveTo(X(292), Y(34), X(268), Y(38));
      g.lineTo(X(232), Y(36));
      g.closePath();
      g.fill();

      // --- Torso, inclinado hacia el trabajo ---
      g.beginPath();
      g.moveTo(X(148), Y(-188)); // hombro delantero
      g.quadraticCurveTo(X(114), Y(-152), X(120), Y(-112)); // pecho
      g.quadraticCurveTo(X(126), Y(-92), X(158), Y(-84)); // cintura
      g.lineTo(X(202), Y(-86)); // cadera
      g.quadraticCurveTo(X(212), Y(-130), X(198), Y(-166)); // espalda
      g.quadraticCurveTo(X(190), Y(-190), X(168), Y(-194)); // nuca
      g.closePath();
      g.fill();

      // Faldón de la campera de cuero, que cae y se abre.
      g.beginPath();
      g.moveTo(X(126), Y(-104));
      g.quadraticCurveTo(X(150), Y(-58), X(206), Y(-56));
      g.lineTo(X(206), Y(-86));
      g.lineTo(X(130), Y(-92));
      g.closePath();
      g.fill();

      // --- Brazo de atrás (el que sostiene la pieza) ---
      g.globalAlpha = 0.92;
      limb(g, [[178, -178], [136, -122], [80, -64]], 22);
      g.globalAlpha = 1;
      // Guante que apoya sobre la viga.
      g.beginPath();
      g.ellipse(X(70), Y(-52), W(19), W(14), -0.5, 0, Math.PI * 2);
      g.fill();

      // --- Brazo de adelante (el que lleva el soplete) ---
      limb(g, [[150, -182], [98, -132], [56, -86]], 24);
      g.beginPath();
      g.ellipse(X(50), Y(-80), W(20), W(16), -0.7, 0, Math.PI * 2);
      g.fill();

      // --- Soplete: mango, cuello y electrodo hasta la punta ---
      g.lineCap = "butt";
      limb(g, [[62, -92], [30, -50]], 13); // mango
      limb(g, [[30, -50], [14, -26]], 9); // cuello
      limb(g, [[14, -26], [1, -3]], 4); // electrodo

      // Manguera: cae del mango, hace panza y se va fuera de cuadro.
      // Un cable con peso es de las cosas que más "foto" agregan.
      g.lineCap = "round";
      g.lineWidth = W(7);
      g.beginPath();
      g.moveTo(X(64), Y(-88));
      g.bezierCurveTo(X(108), Y(-30), X(150), Y(24), X(232), Y(30));
      g.stroke();
      g.beginPath();
      g.moveTo(X(232), Y(30));
      g.bezierCurveTo(X(300), Y(36), X(340), Y(18), X(420), Y(34));
      g.stroke();

      // --- Casco: cúpula inclinada hacia el trabajo + visor ---
      g.save();
      g.translate(X(150), Y(-226));
      g.rotate(-0.38);
      g.beginPath();
      g.ellipse(0, 0, W(34), W(40), 0, 0, Math.PI * 2);
      g.fill();
      // El pico del casco, que sobresale hacia adelante y abajo.
      g.beginPath();
      g.moveTo(W(-32), W(-8));
      g.quadraticCurveTo(W(-46), W(26), W(-16), W(40));
      g.lineTo(W(20), W(34));
      g.quadraticCurveTo(W(30), W(10), W(24), W(-14));
      g.closePath();
      g.fill();
      g.restore();
      // Cuello del casco contra el hombro.
      limb(g, [[160, -196], [172, -184]], 22);
    }

    /** Convierte una silueta en su versión iluminada: la misma forma,
     *  pero rellena con un degradé que nace en el arco. 'source-in'
     *  pinta sólo donde la silueta ya tenía tinta. */
    function litFrom(src: HTMLCanvasElement) {
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const g = out.getContext("2d");
      if (!g) return out;
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = "source-in";
      const grad = g.createRadialGradient(arcX, arcY, 0, arcX, arcY, W(430));
      grad.addColorStop(0, "rgba(226,244,255,1)");
      grad.addColorStop(0.16, "rgba(168,214,255,0.92)");
      grad.addColorStop(0.42, "rgba(86,150,235,0.5)");
      grad.addColorStop(0.72, "rgba(44,86,168,0.2)");
      grad.addColorStop(1, "rgba(20,40,90,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, out.width, out.height);
      return out;
    }

    function layer() {
      const c = document.createElement("canvas");
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      const g = c.getContext("2d");
      if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return c;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // La escena se encuadra por lo más chico: en pantallas angostas
      // el soldador se recorta por la derecha, que es lo que haría una
      // foto, en vez de encogerse hasta volverse un muñequito.
      k = Math.min(height / 330, width / 380);
      arcX = width * 0.56;
      arcY = height * 0.74;

      far = layer();
      const farCtx = far.getContext("2d");
      if (farCtx) paintFar(farCtx);

      near = layer();
      const nearCtx = near.getContext("2d");
      if (nearCtx) paintNear(nearCtx);

      nearLit = litFrom(near);

      sparks.length = 0;
      puffs.length = 0;
      if (reduced) drawFrame(1200);
    }

    /* ---------------------------------------------------------
       PARTÍCULAS
       --------------------------------------------------------- */
    function emitSparks(level: number, dt: number) {
      const n = Math.round((2 + level * 9) * dt);
      for (let i = 0; i < n; i++) {
        // El chorro sale hacia abajo y a la izquierda (el lado por el
        // que avanza el electrodo), abanicado.
        const angle = Math.PI * (0.62 + Math.random() * 0.62);
        const speed = W(1.1 + Math.random() * Math.random() * 7.5);
        sparks.push({
          x: arcX,
          y: arcY,
          px: arcX,
          py: arcY,
          vx: Math.cos(angle) * speed,
          vy: -Math.abs(Math.sin(angle)) * speed * 0.55 + W(0.4),
          life: 1,
          maxLife: 26 + Math.random() * 58,
          size: W(0.7 + Math.random() * 1.5),
          bounces: Math.random() < 0.55 ? 2 : 0,
        });
      }
    }

    function updateSparks(dt: number) {
      const gravity = W(0.055) * dt;
      const floorY = Y(FLOOR - 2);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.px = s.x;
        s.py = s.y;
        s.vy += gravity;
        s.vx *= Math.pow(0.985, dt);
        s.vy *= Math.pow(0.99, dt);
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        if (s.y > floorY && s.vy > 0) {
          if (s.bounces > 0) {
            s.bounces--;
            s.y = floorY;
            s.vy *= -0.34;
            s.vx *= 0.55;
          } else {
            s.life = 0;
          }
        }

        s.life -= dt / s.maxLife;
        if (s.life <= 0) {
          // Al apagarse, a veces revienta en microchispas: el crepitar
          // de la escoria. Poco frecuente, pero es lo que da vida.
          if (Math.random() < 0.07 && sparks.length < 420) {
            for (let j = 0; j < 4; j++) {
              sparks.push({
                x: s.x,
                y: s.y,
                px: s.x,
                py: s.y,
                vx: (Math.random() - 0.5) * W(2.4),
                vy: (Math.random() - 0.7) * W(2.4),
                life: 1,
                maxLife: 10 + Math.random() * 14,
                size: W(0.5),
                bounces: 0,
              });
            }
          }
          sparks.splice(i, 1);
        }
      }
      if (sparks.length > 460) sparks.splice(0, sparks.length - 460);
    }

    function drawSparks() {
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (const s of sparks) {
        const heat = s.life;
        // Se enfría mientras vuela: blanco → amarillo → naranja → rojo.
        const r = 255;
        const g = Math.round(90 + 165 * heat);
        const b = Math.round(20 + 200 * heat * heat);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.25 + 0.7 * heat})`;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function updatePuffs(dt: number) {
      if (puffs.length < 26 && Math.random() < 0.09 * dt) {
        puffs.push({
          x: arcX + (Math.random() - 0.5) * W(30),
          y: arcY - W(6),
          r: W(12 + Math.random() * 16),
          vx: W(-0.18 + Math.random() * 0.5),
          vy: W(-0.42 - Math.random() * 0.4),
          life: 1,
          maxLife: 160 + Math.random() * 180,
          front: Math.random(),
        });
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += W(0.22) * dt;
        p.vx += W(0.004) * dt; // deriva: el humo se va escorando
        p.life -= dt / p.maxLife;
        if (p.life <= 0) puffs.splice(i, 1);
      }
    }

    function drawPuffs(front: boolean, level: number) {
      for (const p of puffs) {
        if (p.front > 0.62 !== front) continue;
        // El humo se ilumina desde abajo: cuanto más cerca del arco,
        // más frío y brillante; arriba se apaga y se vuelve gris.
        const heat = Math.max(0, 1 - (arcY - p.y) / W(210));
        const alpha = p.life * (1 - p.life) * 1.7 * (0.1 + heat * 0.5) * level;
        if (alpha <= 0.004) continue;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(${170 + heat * 60},${190 + heat * 50},${215 + heat * 40},${alpha})`);
        grad.addColorStop(0.55, `rgba(120,140,170,${alpha * 0.4})`);
        grad.addColorStop(1, "rgba(90,105,130,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ---------------------------------------------------------
       EL FRAME
       --------------------------------------------------------- */
    function drawFrame(t: number) {
      const level = reduced ? 0.85 : arcLevel(t);

      // Cielo del taller: casi negro, con el aire tibio del arco.
      const sky = ctx.createLinearGradient(0, 0, width * 0.4, height);
      sky.addColorStop(0, "#070c17");
      sky.addColorStop(0.55, "#0a1220");
      sky.addColorStop(1, "#05080f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      if (far) ctx.drawImage(far, 0, 0, width, height);

      // Derrame de luz del arco sobre el taller entero.
      ctx.globalCompositeOperation = "lighter";
      const spill = ctx.createRadialGradient(arcX, arcY, 0, arcX, arcY, W(520));
      spill.addColorStop(0, `rgba(198,228,255,${0.5 * level})`);
      spill.addColorStop(0.12, `rgba(120,180,255,${0.3 * level})`);
      spill.addColorStop(0.38, `rgba(56,116,214,${0.14 * level})`);
      spill.addColorStop(1, "rgba(20,44,96,0)");
      ctx.fillStyle = spill;
      ctx.fillRect(0, 0, width, height);

      // Charco de luz sobre el piso: elipse muy aplastada, porque la
      // luz cae rasante.
      const pool = ctx.createRadialGradient(arcX, Y(FLOOR + 22), 0, arcX, Y(FLOOR + 22), W(300));
      pool.addColorStop(0, `rgba(150,196,255,${0.3 * level})`);
      pool.addColorStop(1, "rgba(30,60,120,0)");
      ctx.save();
      ctx.translate(arcX, Y(FLOOR + 22));
      ctx.scale(1, 0.3);
      ctx.translate(-arcX, -Y(FLOOR + 22));
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";

      if (!reduced) drawPuffs(false, level);

      // La silueta: primero la copia iluminada corrida hacia el arco
      // (queda asomando el contorno de luz), después la copia negra.
      if (nearLit) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.min(1, 0.55 + level * 0.5);
        ctx.drawImage(nearLit, -W(4.5), W(2.5), width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (near) ctx.drawImage(near, 0, 0, width, height);
      if (nearLit) {
        // Segunda pasada en su lugar exacto y muy tenue: es la luz que
        // envuelve el cuerpo, no el filo. Sin esto el soldador queda
        // recortado como una calcomanía.
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.22 * level;
        ctx.drawImage(nearLit, 0, 0, width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.globalCompositeOperation = "lighter";

      // Pileta de fusión: el metal fundido, naranja, sobre la viga.
      const melt = ctx.createRadialGradient(arcX - W(6), arcY + W(4), 0, arcX - W(6), arcY + W(4), W(46));
      melt.addColorStop(0, `rgba(255,238,190,${0.95 * level})`);
      melt.addColorStop(0.3, `rgba(255,164,54,${0.75 * level})`);
      melt.addColorStop(0.7, `rgba(214,72,16,${0.3 * level})`);
      melt.addColorStop(1, "rgba(120,30,0,0)");
      ctx.fillStyle = melt;
      ctx.save();
      ctx.translate(arcX - W(6), arcY + W(4));
      ctx.scale(1, 0.45);
      ctx.translate(-(arcX - W(6)), -(arcY + W(4)));
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // El arco: un núcleo chiquito y reventado de blanco, más el halo.
      const halo = ctx.createRadialGradient(arcX, arcY, 0, arcX, arcY, W(90));
      halo.addColorStop(0, `rgba(255,255,255,${level})`);
      halo.addColorStop(0.1, `rgba(232,246,255,${0.9 * level})`);
      halo.addColorStop(0.3, `rgba(150,205,255,${0.42 * level})`);
      halo.addColorStop(1, "rgba(90,160,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(arcX, arcY, W(90), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, level)})`;
      ctx.beginPath();
      ctx.arc(arcX, arcY, W(3.4 + level * 2), 0, Math.PI * 2);
      ctx.fill();

      // Estirado anamórfico y estrella de diafragma: los defectos de
      // lente son la firma más barata de "esto se fotografió".
      ctx.save();
      ctx.translate(arcX, arcY);
      const streak = ctx.createLinearGradient(-W(240), 0, W(240), 0);
      streak.addColorStop(0, "rgba(120,180,255,0)");
      streak.addColorStop(0.5, `rgba(210,236,255,${0.4 * level})`);
      streak.addColorStop(1, "rgba(120,180,255,0)");
      ctx.fillStyle = streak;
      ctx.fillRect(-W(240), -W(2.4 + level * 2), W(480), W(4.8 + level * 4));
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = `rgba(226,244,255,${0.14 * level})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W(110), -W(2.5));
        ctx.lineTo(W(110), W(2.5));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Reflejo del arco sobre la curva del casco.
      ctx.save();
      ctx.translate(X(132), Y(-232));
      ctx.rotate(-0.38);
      ctx.scale(1, 0.42);
      const gleam = ctx.createRadialGradient(0, 0, 0, 0, 0, W(26));
      gleam.addColorStop(0, `rgba(214,238,255,${0.5 * level})`);
      gleam.addColorStop(1, "rgba(140,190,255,0)");
      ctx.fillStyle = gleam;
      ctx.beginPath();
      ctx.arc(0, 0, W(26), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";

      if (!reduced) {
        drawSparks();
        drawPuffs(true, level);

        // Bokeh: chispas que pasan cerca del lente, tan desenfocadas
        // que son discos. Es lo que instala la profundidad de campo.
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 5; i++) {
          const seed = i * 7.3;
          const cycle = (t * (0.00006 + i * 0.000018) + hash(seed)) % 1;
          const bx = width * (1.05 - cycle * 1.25) + Math.sin(t * 0.0004 + seed) * W(30);
          const by = arcY + W(70) - cycle * W(150) + Math.sin(t * 0.0006 + seed) * W(20);
          const rr = W(9 + hash(seed + 1) * 16);
          const a = Math.sin(cycle * Math.PI) * 0.16 * level;
          const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
          bg2.addColorStop(0, `rgba(255,206,140,${a})`);
          bg2.addColorStop(0.7, `rgba(255,150,60,${a * 0.5})`);
          bg2.addColorStop(1, "rgba(255,120,40,0)");
          ctx.fillStyle = bg2;
          ctx.beginPath();
          ctx.arc(bx, by, rr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // Viñeta: cierra el encuadre y despega el texto del hero.
      const vig = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.25,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.78
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(2,5,12,0.72)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);
    }

    function loop(now: number) {
      // dt en "frames de 60 Hz": el movimiento no cambia con el refresco
      // de la pantalla. Se recorta a 3 para que volver a una pestaña
      // dormida no teletransporte las chispas.
      const dt = Math.min(3, last ? (now - last) / 16.667 : 1);
      last = now;
      const level = arcLevel(now);
      emitSparks(level, dt);
      updateSparks(dt);
      updatePuffs(dt);
      drawFrame(now);
      if (running) frameId = requestAnimationFrame(loop);
    }

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Si el hero no se ve (scrolleado o pestaña de fondo) no se dibuja:
    // es un canvas animado, no vale la pena quemar batería por él.
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && !document.hidden;
        if (visible && !running && !reduced) {
          running = true;
          last = 0;
          frameId = requestAnimationFrame(loop);
        } else if (!visible && running) {
          running = false;
          cancelAnimationFrame(frameId);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden && running) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!document.hidden && !running && !reduced) {
        running = true;
        last = 0;
        frameId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      running = false;
    } else {
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
