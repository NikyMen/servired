import Link from "next/link";
import type { Metadata } from "next";
import { PreinscripcionForm } from "@/components/PreinscripcionForm";

export const metadata: Metadata = { title: "Preinscripción" };

export default function PreinscripcionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-sm font-medium text-cliente hover:underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Preinscribite a ServiRed</h1>
        <p className="mt-1 text-slate-500">
          Dejanos tus datos y te avisamos apenas abramos en tu zona. Sin costo y sin compromiso.
        </p>
      </div>

      <PreinscripcionForm />
    </div>
  );
}
