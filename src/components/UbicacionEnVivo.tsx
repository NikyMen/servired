"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_UBICACION, haversineKm, leerPuntoCookie, valorCookieUbicacion, type Punto } from "@/lib/geo";

type Estado = "inactivo" | "buscando" | "activo" | "denegado" | "no-disponible";
type Contexto = {
  posicion: Punto | null;
  /** Radio de error del GPS, en metros. */
  precision: number | null;
  estado: Estado;
  /** Pide la posición una vez (botón "Ubicarme ahora"). */
  ubicarmeAhora: () => Promise<Punto | null>;
};

const UbicacionContext = createContext<Contexto>({ posicion: null, precision: null, estado: "inactivo", ubicarmeAhora: async () => null });
export const useUbicacion = () => useContext(UbicacionContext);

/** Moverse menos que esto no justifica volver a pedir la página. */
const UMBRAL_KM = 1;

function leerCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_UBICACION}=([^;]*)`));
  return leerPuntoCookie(match?.[1]);
}

function escribirCookie(punto: Punto) {
  const segura = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_UBICACION}=${encodeURIComponent(valorCookieUbicacion(punto))}; path=/; max-age=86400; samesite=lax${segura}`;
}

function borrarCookie() {
  document.cookie = `${COOKIE_UBICACION}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Sigue la ubicación del usuario con sesión mientras la página está a la
 * vista (en segundo plano se corta: batería). El puntito del mapa se mueve con
 * cada lectura, pero la página solo se vuelve a pedir al servidor cuando la
 * persona se alejó más de 1 km: ahí cambian la lista y las distancias.
 * La ubicación va en una cookie redondeada a ~100 m; no se guarda en la base.
 */
export function UbicacionEnVivo({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [posicion, setPosicion] = useState<Punto | null>(null);
  const [precision, setPrecision] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>("inactivo");

  const aplicar = useCallback((coords: GeolocationCoordinates) => {
    const punto = { lat: coords.latitude, lng: coords.longitude };
    setPosicion(punto);
    setPrecision(coords.accuracy);
    setEstado("activo");
    const guardada = leerCookie();
    if (!guardada || haversineKm(guardada, punto) > UMBRAL_KM) {
      escribirCookie(punto);
      router.refresh();
    }
  }, [router]);

  const fallo = useCallback((error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      setEstado("denegado");
      // Sin permiso, que el servidor vuelva a la localidad.
      if (leerCookie()) { borrarCookie(); router.refresh(); }
      return;
    }
    setEstado((actual) => (actual === "activo" ? actual : "no-disponible"));
  }, [router]);

  useEffect(() => {
    if (!activo) return;
    if (!("geolocation" in navigator)) { setEstado("no-disponible"); return; }
    let id: number | null = null;
    const empezar = () => {
      if (id != null || document.visibilityState !== "visible") return;
      setEstado((actual) => (actual === "activo" ? actual : "buscando"));
      id = navigator.geolocation.watchPosition((p) => aplicar(p.coords), fallo, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
    };
    const parar = () => {
      if (id != null) navigator.geolocation.clearWatch(id);
      id = null;
    };
    const alCambiar = () => (document.visibilityState === "visible" ? empezar() : parar());
    empezar();
    document.addEventListener("visibilitychange", alCambiar);
    return () => { parar(); document.removeEventListener("visibilitychange", alCambiar); };
  }, [activo, aplicar, fallo]);

  const ubicarmeAhora = useCallback(() => new Promise<Punto | null>((resolve) => {
    if (!("geolocation" in navigator)) { setEstado("no-disponible"); return resolve(null); }
    navigator.geolocation.getCurrentPosition(
      (p) => { aplicar(p.coords); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      (error) => { fallo(error); resolve(null); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    );
  }), [aplicar, fallo]);

  const valor = useMemo(() => ({ posicion, precision, estado, ubicarmeAhora }), [posicion, precision, estado, ubicarmeAhora]);
  return <UbicacionContext.Provider value={valor}>{children}</UbicacionContext.Provider>;
}
