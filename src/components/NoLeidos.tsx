"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { contarChatsConNoLeidos } from "@/lib/mensajes";
import { habilitarSonido, sonarNotificacion } from "@/lib/sonido";
import type { Mode } from "@/lib/types";

/** Cada cuánto se pregunta si llegó algo. Más liviano que traer los mensajes. */
const POLL_MS = 12000;

/** Ventana en la que no se repite el "ya lo leí" del mismo hilo. */
const MARCA_MS = 3000;

type NoLeidosCtx = {
  /** Mensajes sin leer por conversación. */
  porConversacion: Record<string, number>;
  /** Chats con algo sin leer: el número del globito, uno por chat. */
  total: number;
  /** El que mira abrió el hilo: baja el contador acá y en el servidor. */
  marcarLeida: (id: string) => void;
  /** Hilo que está a la vista. No suena ni se cuenta mientras se lo mira. */
  mirandoHilo: (id: string | null) => void;
};

// Valores por defecto para que <Chat> siga funcionando fuera del provider
// (por ejemplo si algún día se lo usa en una pantalla suelta).
const Ctx = createContext<NoLeidosCtx>({
  porConversacion: {},
  total: 0,
  marcarLeida: () => {},
  mirandoHilo: () => {},
});

export const useNoLeidos = () => useContext(Ctx);

/**
 * Un solo poll para toda la pantalla.
 *
 * El globito lo miran tres lugares (header, barra inferior y botón flotante) y
 * el chat necesita el detalle por hilo: si cada uno consultara por su cuenta
 * serían cuatro pedidos iguales cada doce segundos, y el sonido sonaría
 * cuatro veces.
 */
export function NoLeidosProvider({
  mode,
  activo,
  children,
}: {
  mode: Mode;
  /** Sin sesión no hay bandeja: ni poll ni sonido. */
  activo: boolean;
  children: React.ReactNode;
}) {
  const esPro = mode === "pro";
  const [porConversacion, setPorConversacion] = useState<Record<string, number>>({});

  // El snapshot anterior: el sonido sale de comparar, no de que haya sin leer
  // (si no, sonaría en loop mientras quede algo pendiente).
  const previo = useRef<Record<string, number> | null>(null);
  const hiloALaVista = useRef<string | null>(null);
  const ultimaMarca = useRef<Record<string, number>>({});

  const aplicar = useCallback(
    (datos: { porConversacion?: Record<string, number> }, silencioso = false) => {
      const nuevo = datos.porConversacion ?? {};
      const anterior = previo.current;

      // En la primera respuesta no suena: lo que ya estaba sin leer no es nuevo.
      if (!silencioso && anterior) {
        const llegoAlgo = Object.entries(nuevo).some(([id, n]) => {
          if (n <= (anterior[id] ?? 0)) return false;
          // Con el hilo abierto y la pestaña a la vista el usuario ya lo está
          // viendo; en segundo plano sí conviene avisarle.
          return !(id === hiloALaVista.current && document.visibilityState === "visible");
        });
        if (llegoAlgo) sonarNotificacion();
      }

      previo.current = nuevo;
      setPorConversacion(nuevo);
    },
    []
  );

  // Poll del resumen. A diferencia del chat, sigue con la pestaña en segundo
  // plano: avisar de un mensaje mientras mirás otra pestaña es justamente para
  // lo que existe esto.
  useEffect(() => {
    if (!activo) {
      previo.current = null;
      setPorConversacion({});
      return;
    }
    let cancelado = false;

    async function consultar() {
      try {
        const res = await fetch(`/api/conversaciones/no-leidos${esPro ? "?como=pro" : ""}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelado) return;
        aplicar(await res.json());
      } catch {
        // Se cayó la red un segundo: el próximo tick reintenta solo.
      }
    }

    consultar();
    const timer = setInterval(consultar, POLL_MS);
    // Al volver a la pestaña se refresca sin esperar los doce segundos.
    document.addEventListener("visibilitychange", consultar);
    window.addEventListener("focus", consultar);
    return () => {
      cancelado = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", consultar);
      window.removeEventListener("focus", consultar);
    };
  }, [activo, esPro, aplicar]);

  // El audio arranca suspendido hasta que la persona toca algo: se lo despierta
  // en el primer gesto, si no el primer mensaje llega mudo.
  useEffect(() => {
    if (!activo) return;
    const despertar = () => habilitarSonido();
    window.addEventListener("pointerdown", despertar, { once: true });
    window.addEventListener("keydown", despertar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", despertar);
      window.removeEventListener("keydown", despertar);
    };
  }, [activo]);

  const marcarLeida = useCallback(
    async (id: string) => {
      const ahora = Date.now();
      // El chat llama a esto cada vez que entra algo al hilo abierto: sin freno
      // sería un UPDATE por mensaje recibido.
      if (ahora - (ultimaMarca.current[id] ?? 0) < MARCA_MS) return;
      ultimaMarca.current[id] = ahora;

      // Baja el globito en el acto; el servidor confirma con el resumen nuevo.
      // Se escribe el cero aunque el hilo no esté en el mapa: antes del primer
      // poll el chat se guía por el número que trajo el servidor al renderizar.
      setPorConversacion((prev) => (prev[id] === 0 ? prev : { ...prev, [id]: 0 }));
      if (previo.current) previo.current = { ...previo.current, [id]: 0 };

      try {
        const res = await fetch(`/api/conversaciones/${id}/leido`, { method: "POST" });
        if (!res.ok) return;
        // Silencioso: acá los contadores sólo bajan, nada que anunciar.
        aplicar(await res.json(), true);
      } catch {
        // El próximo poll lo vuelve a dejar en su lugar.
      }
    },
    [aplicar]
  );

  const mirandoHilo = useCallback((id: string | null) => {
    hiloALaVista.current = id;
  }, []);

  const valor = useMemo<NoLeidosCtx>(
    () => ({
      porConversacion,
      total: contarChatsConNoLeidos(porConversacion),
      marcarLeida,
      mirandoHilo,
    }),
    [porConversacion, marcarLeida, mirandoHilo]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/**
 * El globito rojo con el número.
 *
 * Rojo y no el color del modo: es un aviso, tiene que despegarse del acento de
 * la pantalla en vez de confundirse con él.
 */
export function NoLeidosBadge({
  n,
  className = "",
  label,
}: {
  n: number;
  className?: string;
  /** Qué se cuenta, para el lector de pantalla. Por defecto, chats. */
  label?: string;
}) {
  if (n <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] leading-[18px] font-bold text-white ring-2 ring-white/80 ${className}`}
    >
      {/* Visualmente se corta en 9+, pero el número real se dice completo. */}
      <span aria-hidden>{n > 9 ? "9+" : n}</span>
      <span className="sr-only">
        {label ?? (n === 1 ? "1 chat sin leer" : `${n} chats sin leer`)}
      </span>
    </span>
  );
}
