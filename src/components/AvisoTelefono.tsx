"use client";

import { MENSAJE_CONTACTO_BLOQUEADO, tieneTelefono } from "@/lib/contacto";

/**
 * El cartel de "no se pueden compartir teléfonos", mientras se escribe.
 * Lo usan el chat, los presupuestos y las solicitudes; el servidor igual
 * rechaza lo que llegue con un número.
 */
export function AvisoTelefono({ texto, className = "" }: { texto: string; className?: string }) {
  if (!tieneTelefono(texto)) return null;
  return (
    <p role="alert" className={`flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 ${className}`}>
      <span aria-hidden>🚫</span>
      <span>{MENSAJE_CONTACTO_BLOQUEADO} Borrá el número para poder enviar.</span>
    </p>
  );
}
