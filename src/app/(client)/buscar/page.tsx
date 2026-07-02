import { Suspense } from "react";
import type { Metadata } from "next";
import { BuscarClient } from "@/components/BuscarClient";

export const metadata: Metadata = {
  title: "Explorar servicios",
};

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="text-slate-500">Cargando…</div>}>
      <BuscarClient />
    </Suspense>
  );
}
