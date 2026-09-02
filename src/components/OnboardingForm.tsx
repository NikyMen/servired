"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const missingEmail = email.endsWith("@pending.servired.invalid");
  const [address, setAddress] = useState(missingEmail ? "" : email);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const field = "glass-field w-full px-3 py-2.5 text-sm";

  async function setEmail() {
    setBusy(true); setMessage(null);
    const res = await fetch("/api/auth/email/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: address }) });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Te enviamos el código." : data.error || "No pudimos guardar el email.");
    setBusy(false); if (res.ok) router.refresh();
  }

  async function verify() {
    setBusy(true); setMessage(null);
    const res = await fetch("/api/auth/email/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: code }) });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Email verificado." : data.error || "Código inválido.");
    setBusy(false); if (res.ok) router.refresh();
  }

  async function resend() {
    setBusy(true); setMessage(null);
    const res = await fetch("/api/auth/email/send", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Te enviamos un código nuevo." : data.error || "No pudimos reenviar el código.");
    setBusy(false);
  }

  return <section className="glass glass-solid mx-auto max-w-md space-y-5 rounded-2xl p-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Verificá tu correo</h1><p className="mt-1 text-sm text-slate-500">La cuenta se habilita cuando confirmás el código de seis dígitos.</p></div>
    {missingEmail ? <><label className="block text-sm font-medium text-slate-700">Email<input value={address} onChange={(e) => setAddress(e.target.value)} type="email" className={`${field} mt-1`} /></label><button type="button" disabled={busy} onClick={setEmail} className="glass-btn w-full px-4 py-3 text-sm">Guardar y enviar código</button></> : <><p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">Código enviado a <strong>{email}</strong></p><label className="block text-sm font-medium text-slate-700">Código<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className={`${field} mt-1 text-center tracking-[.35em]`} /></label><button type="button" disabled={busy || code.length !== 6} onClick={verify} className="glass-btn w-full px-4 py-3 text-sm">Verificar email</button><button type="button" disabled={busy} onClick={resend} className="mx-auto block text-sm font-semibold text-cliente-dark hover:underline">Reenviar código</button></>}
    {message && <p role="alert" className="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700">{message}</p>}
  </section>;
}
