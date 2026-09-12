"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Confirmación de la baja. Pide tipear el email a propósito: un botón suelto
 * se toca sin querer, y esto no se puede deshacer.
 */
export function BajaCuentaForm({ email, tieneContrasena }: { email: string; tieneContrasena: boolean }) {
  const router = useRouter();
  const [confirmacion, setConfirmacion] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puede = confirmacion.trim().toLowerCase() === email.toLowerCase() && (!tieneContrasena || password.length > 0);

  async function darDeBaja() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/cuenta/baja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: confirmacion.trim(), password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "No pudimos dar de baja la cuenta.");
      setBusy(false);
      return;
    }
    // La sesión ya no existe: se va a la portada como invitado.
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="glass glass-solid space-y-4 rounded-2xl border-red-200 p-5 sm:p-6">
      <div className="space-y-2 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Se borra todo y no hay vuelta atrás:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Tu perfil, tus fotos y tus muestras de trabajo.</li>
          <li>Tus solicitudes, contrataciones y pagos.</li>
          <li>Tus conversaciones, que también desaparecen para la otra persona.</li>
          <li>Tus documentos de verificación de identidad.</li>
        </ul>
        <p>Las opiniones que escribiste quedan publicadas: son la reputación de quien te trabajó.</p>
      </div>

      <label className="block text-sm font-medium text-slate-900">
        Escribí <span className="font-mono text-slate-600">{email}</span> para confirmar
        <input value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} autoComplete="off" className="glass-field mt-1 w-full px-3 py-2.5 text-sm" />
      </label>

      {tieneContrasena && (
        <label className="block text-sm font-medium text-slate-900">
          Tu contraseña
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="glass-field mt-1 w-full px-3 py-2.5 text-sm" />
        </label>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="button" disabled={!puede || busy} onClick={darDeBaja} className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
        {busy ? "Borrando…" : "Dar de baja mi cuenta para siempre"}
      </button>
    </div>
  );
}
