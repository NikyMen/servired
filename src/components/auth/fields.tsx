"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import type { Mode } from "@/lib/types";

/** Campo de contraseña con ojito para ver lo que se escribe. */
export function PasswordField({
  id,
  label,
  autoComplete,
  tone = "cliente",
  hint,
}: {
  id: string;
  label: string;
  autoComplete: string;
  tone?: Mode;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const focus =
    tone === "pro"
      ? "focus:border-pro focus:ring-pro/20"
      : "focus:border-cliente focus:ring-cliente/20";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          placeholder="••••••••"
          className={`glass-field py-3 pr-12 pl-3.5 text-sm ${focus}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute top-1/2 right-1 -translate-y-1/2 rounded-lg p-2.5 text-slate-400 transition-colors hover:text-slate-600"
        >
          {visible ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * Error del server action.
 * role="alert" para que el lector de pantalla lo cante apenas aparece: si no,
 * quien no ve la pantalla manda el form y no se entera de que falló.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-300/50 bg-red-50/70 px-3.5 py-2.5 backdrop-blur-sm text-sm text-red-700"
    >
      {message}
    </p>
  );
}

/** Botón que se deshabilita solo mientras el form viaja. */
export function SubmitButton({
  children,
  tone = "cliente",
  pendingLabel = "Enviando…",
}: {
  children: React.ReactNode;
  tone?: Mode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const accent =
    tone === "pro"
      ? "[--accent-rgb:5_150_105] [--accent-dark:var(--color-pro-dark)]"
      : "[--accent-rgb:37_99_235] [--accent-dark:var(--color-cliente-dark)]";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`glass-btn w-full px-4 py-3 text-sm ${accent}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
