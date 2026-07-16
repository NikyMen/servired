"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type Tipo = "cliente" | "profesional";

type Form = {
  name: string;
  email: string;
  phone: string;
  type: Tipo;
};

const empty: Form = { name: "", email: "", phone: "", type: "cliente" };

const opciones: { value: Tipo; title: string; desc: string }[] = [
  { value: "cliente", title: "Busco servicios", desc: "Necesito contratar profesionales" },
  { value: "profesional", title: "Ofrezco servicios", desc: "Quiero conseguir clientes" },
];

export function PreinscripcionForm() {
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Tipo | null>(null);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/preinscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos registrar tu preinscripción.");
      }
      setDone(form.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setSubmitting(false);
    }
  }

  const acento = form.type === "profesional" ? "pro" : "cliente";
  // Clases literales: Tailwind no ve los nombres armados por interpolación.
  const focusCls =
    acento === "pro"
      ? "focus:border-pro focus:ring-pro/20"
      : "focus:border-cliente focus:ring-cliente/20";
  const inputCls = `w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 ${focusCls}`;

  if (done) {
    const esPro = done === "profesional";
    return (
      <div
        className={`rounded-2xl border p-8 text-center ${
          esPro ? "border-emerald-200 bg-pro-soft" : "border-blue-200 bg-cliente-soft"
        }`}
      >
        <p className="text-4xl">🎉</p>
        <h2 className="mt-3 text-xl font-bold text-slate-900">¡Listo, {form.name.trim()}!</h2>
        <p className="mt-2 text-slate-600">
          Te preinscribimos como{" "}
          <strong>{esPro ? "profesional" : "cliente"}</strong>. Te escribimos a{" "}
          <strong>{form.email.trim().toLowerCase()}</strong> apenas abramos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-900">¿Cómo querés usar ServiRed?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {opciones.map((o) => {
            const activa = form.type === o.value;
            const color = o.value === "profesional" ? "pro" : "cliente";
            return (
              <label
                key={o.value}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                  activa
                    ? color === "pro"
                      ? "border-pro bg-pro-soft"
                      : "border-cliente bg-cliente-soft"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={o.value}
                  checked={activa}
                  onChange={() => update("type", o.value)}
                  className="sr-only"
                />
                <span
                  className={`block text-sm font-semibold ${
                    activa ? (color === "pro" ? "text-pro-dark" : "text-cliente-dark") : "text-slate-900"
                  }`}
                >
                  {o.title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{o.desc}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="pre-name" className="mb-1 block text-sm font-medium text-slate-900">
          Nombre y apellido
        </label>
        <input
          id="pre-name"
          required
          minLength={2}
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ej: Julieta Ramírez"
          className={inputCls}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pre-email" className="mb-1 block text-sm font-medium text-slate-900">
            Correo electrónico
          </label>
          <input
            id="pre-email"
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="julieta@correo.com"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="pre-phone" className="mb-1 block text-sm font-medium text-slate-900">
            Teléfono
          </label>
          <input
            id="pre-phone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="11 5555 4444"
            className={inputCls}
          />
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        variant={acento}
        disabled={submitting}
        className="w-full disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Quiero preinscribirme"}
      </Button>

      <p className="text-center text-xs text-slate-400">
        Los tres campos son obligatorios. Usamos tus datos solo para avisarte del lanzamiento.
      </p>
    </form>
  );
}
