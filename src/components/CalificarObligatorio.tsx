"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui";
import { StarIcon } from "@/components/icons";
import type { CalificacionPendiente } from "@/lib/calificacion";

const ETIQUETAS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

/**
 * Pantalla que tapa el sitio hasta que el cliente califica el último trabajo
 * que pagó, como en Uber. Solo deja calificar o cerrar sesión; el servidor
 * además rechaza contratar, escribir o publicar mientras esté pendiente.
 */
export function CalificarObligatorio({ pendiente }: { pendiente: CalificacionPendiente }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lo de atrás no se mueve mientras la pantalla está abierta.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, []);

  const listo = rating >= 1 && comment.trim().length >= 5;
  const mostrado = hover || rating;

  async function enviar() {
    if (!listo) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pagos/${pendiente.paymentId}/resena`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No pudimos guardar tu calificación.");
      // El layout se vuelve a armar: si había otro trabajo sin calificar, aparece ese.
      setRating(0);
      setComment("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar tu calificación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="calificar-titulo" className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-sheet-up w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex flex-col items-center text-center">
          <Avatar name={pendiente.profesional.nombre} color={pendiente.profesional.avatarColor} src={pendiente.profesional.avatarUrl} size={64} />
          <h2 id="calificar-titulo" className="mt-3 text-xl font-extrabold text-slate-900">¿Cómo te fue con {pendiente.profesional.nombre}?</h2>
          <p className="mt-1 text-sm text-slate-500">{pendiente.trabajo}</p>
          <p className="mt-2 text-xs text-slate-400">Para seguir usando ServiRed, calificá el trabajo que pagaste. Tu opinión ayuda a otros clientes a elegir.</p>
        </div>

        <div className="mt-5 flex justify-center gap-1.5" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"} · ${ETIQUETAS[n]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className={`rounded-full p-1 transition-transform hover:scale-110 ${n <= mostrado ? "text-amber-400" : "text-slate-200"}`}
            >
              <StarIcon width={38} height={38} filled={n <= mostrado} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-center text-sm font-semibold text-slate-600">{ETIQUETAS[mostrado]}</p>

        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="Contá cómo fue el trabajo (mínimo 5 letras)"
          className="glass-field mt-3 w-full resize-none px-3 py-2.5 text-base sm:text-sm"
        />

        {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <button type="button" disabled={!listo || busy} onClick={enviar} className="mt-4 w-full rounded-xl bg-cliente px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cliente-dark disabled:opacity-50">
          {busy ? "Enviando…" : "Enviar calificación"}
        </button>
        <form action={logoutAction} className="mt-2 text-center">
          <button type="submit" className="text-xs font-medium text-slate-400 hover:text-slate-600 hover:underline">Cerrar sesión</button>
        </form>
      </div>
    </div>
  );
}
