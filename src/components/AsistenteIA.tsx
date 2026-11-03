"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SparklesIcon } from "@/components/icons";
import type { Mode } from "@/lib/types";

const Panel = dynamic(() => import("@/components/AsistenteIAPanel").then((mod) => mod.AsistenteIAPanel), {
  ssr: false,
  loading: () => <p role="status" className="fixed right-4 bottom-24 z-40 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-lg md:bottom-6">Abriendo asistente…</p>,
});

/** El chat se descarga al abrirlo; conserva la conversación al cerrarlo. */
export function AsistenteIA({ mode }: { mode: Mode }) {
  const [activado, setActivado] = useState(false);
  if (activado) return <Panel mode={mode} />;
  return <button type="button" onClick={() => setActivado(true)} aria-label="Abrir ServiRed IA" title="ServiRed IA" className={`fixed right-4 bottom-24 z-40 flex size-13 items-center justify-center rounded-full text-white shadow-lg transition-all hover:shadow-xl active:scale-95 md:bottom-6 ${mode === "pro" ? "bg-pro hover:bg-pro-dark" : "bg-cliente hover:bg-cliente-dark"}`}><SparklesIcon width={20} height={20} /></button>;
}
