/**
 * Freno de intentos fallidos (login de usuarios y de /admin), en memoria.
 *
 * Alcanza porque ServiRed corre en un solo proceso (pm2 `servired`): se
 * reinicia con el deploy y no se comparte entre réplicas. Si algún día hay
 * más de una instancia, esto va a Redis. Solo cuentan los fallos: entrar bien
 * borra el contador de esa clave.
 */

export type Freno = { max: number; ventanaMs: number };

export const FRENO_LOGIN_EMAIL: Freno = { max: 5, ventanaMs: 15 * 60 * 1000 };
export const FRENO_LOGIN_IP: Freno = { max: 20, ventanaMs: 15 * 60 * 1000 };
export const FRENO_ADMIN_IP: Freno = { max: 5, ventanaMs: 15 * 60 * 1000 };

export function crearFreno() {
  const fallos = new Map<string, { n: number; hasta: number }>();

  function vigente(clave: string, ahora: number) {
    const f = fallos.get(clave);
    if (f && ahora > f.hasta) {
      fallos.delete(clave);
      return null;
    }
    return f ?? null;
  }

  return {
    /** Minutos que faltan si la clave está frenada; null si puede intentar. */
    frenado(clave: string, freno: Freno, ahora = Date.now()) {
      const f = vigente(clave, ahora);
      return f && f.n >= freno.max ? Math.max(1, Math.ceil((f.hasta - ahora) / 60000)) : null;
    },
    fallo(clave: string, freno: Freno, ahora = Date.now()) {
      const f = vigente(clave, ahora);
      if (f) f.n++;
      else fallos.set(clave, { n: 1, hasta: ahora + freno.ventanaMs });
      // Barrido de vencidos: sin esto el Map crece para siempre.
      if (fallos.size > 2000) for (const [k, v] of fallos) if (ahora > v.hasta) fallos.delete(k);
    },
    limpiar(clave: string) {
      fallos.delete(clave);
    },
  };
}

/** El de todo el proceso. */
export const frenoLogin = crearFreno();

export function mensajeFrenado(minutos: number) {
  return `Demasiados intentos fallidos. Esperá ${minutos === 1 ? "1 minuto" : `${minutos} minutos`} y probá de nuevo.`;
}

/**
 * IP del cliente detrás de Traefik. X-Real-Ip la pone Traefik con la dirección
 * real de la conexión; de X-Forwarded-For sirve la ÚLTIMA (la que agrega el
 * proxy): la primera la puede inventar cualquiera mandando el header.
 */
export function ipCliente(headers: { get(nombre: string): string | null }) {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const cadena = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return cadena?.at(-1) ?? "local";
}
