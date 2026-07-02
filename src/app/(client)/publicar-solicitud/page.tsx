import Link from "next/link";
import type { Metadata } from "next";
import { PublicarSolicitudForm } from "@/components/PublicarSolicitudForm";
import { ShieldIcon, VerifiedIcon, HeadsetIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Publicar solicitud" };

const perks = [
  { icon: VerifiedIcon, text: "Solo profesionales verificados ven tu solicitud." },
  { icon: ShieldIcon, text: "Compará presupuestos y elegí con total tranquilidad." },
  { icon: HeadsetIcon, text: "Soporte de ServiRed en cada paso." },
];

export default function PublicarSolicitudPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-sm font-medium text-brand-blue hover:underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Solicitá un servicio</h1>
        <p className="mt-1 text-slate-500">
          Contanos qué necesitás y recibí presupuestos de profesionales cercanos.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {perks.map((p, i) => {
          const Icon = p.icon;
          return (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              <span className="text-brand-blue">
                <Icon width={20} height={20} />
              </span>
              {p.text}
            </li>
          );
        })}
      </ul>

      <PublicarSolicitudForm />
    </div>
  );
}
