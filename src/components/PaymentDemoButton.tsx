"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentDemoButton({ paymentId }: { paymentId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  return <><button disabled={busy} onClick={async () => { setBusy(true); const res = await fetch(`/api/pagos/${paymentId}/confirmar`, { method: "POST" }); if (res.ok) router.push("/mensajes"); else { setError((await res.json().catch(() => ({}))).error ?? "No pudimos confirmar el pago."); setBusy(false); } }} className="w-full rounded-xl bg-[#009ee3] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Procesando…" : "Simular pago aprobado"}</button>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</>;
}

