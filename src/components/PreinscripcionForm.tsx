"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type Tipo = "cliente" | "profesional";
const opciones = [
  ["cliente", "Busco servicios", "Necesito contratar profesionales"],
  ["profesional", "Ofrezco servicios", "Quiero conseguir clientes"],
] as const;

export function PreinscripcionForm() {
  const [type, setType] = useState<Tipo>("cliente");
  const [form, setForm] = useState({ name: "", email: "", phone: "", occupation: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch("/api/preinscripciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, type }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No pudimos registrar tu preinscripción.");
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Ocurrió un error."); }
    finally { setSaving(false); }
  }

  if (done) return <div className="glass-panel rounded-[2rem] p-8 text-center"><p className="text-4xl">🎉</p><h2 className="mt-3 text-xl font-bold">¡Listo, {form.name}!</h2><p className="mt-2 text-slate-600">Te avisamos a {form.email} cuando ServiRed abra en tu zona.</p></div>;
  const input = "glass-input w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cliente/20";
  return <form onSubmit={submit} className="glass-panel space-y-5 rounded-[2rem] p-6 sm:p-8">
    <fieldset><legend className="mb-2 text-sm font-medium text-slate-900">¿Cómo querés usar ServiRed?</legend><div className="grid gap-3 sm:grid-cols-2">{opciones.map(([value, title, desc]) => <label key={value} className={`cursor-pointer rounded-xl border-2 p-4 ${type === value ? value === "profesional" ? "border-pro bg-pro-soft" : "border-cliente bg-cliente-soft" : "border-slate-200 bg-white"}`}><input type="radio" name="type" checked={type === value} onChange={() => setType(value)} className="sr-only" /><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{desc}</span></label>)}</div></fieldset>
    <label className="block text-sm font-medium">Nombre y apellido<input required minLength={2} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ej: Julieta Ramírez" className={`${input} mt-1`} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Correo electrónico<input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={`${input} mt-1`} /></label><label className="block text-sm font-medium">Teléfono<input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={`${input} mt-1`} /></label></div>
    <label className="block text-sm font-medium">Oficio / profesión <span className="font-normal text-slate-400">(opcional)</span><input value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="Ej: Electricista, diseñadora, plomero..." className={`${input} mt-1`} /></label>
    {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Button type="submit" variant={type === "profesional" ? "pro" : "cliente"} disabled={saving} className="w-full">{saving ? "Enviando…" : "Quiero preinscribirme"}</Button><p className="text-center text-xs text-slate-400">Usamos tus datos solo para avisarte del lanzamiento.</p>
  </form>;
}
