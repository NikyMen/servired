import type { Metadata } from "next";
import Link from "next/link";
import { ETIQUETA_AVISO, esTipoAviso, firmaValida } from "@/lib/avisos-correo";
import { bajaDesdeEnlaceAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avisos por correo" };

/** A esta página lleva el "No quiero recibir más estos avisos" de cada mail. */
export default async function AvisosCorreoPage({ searchParams }: { searchParams: Promise<{ u?: string; tipo?: string; t?: string; listo?: string; invalido?: string }> }) {
  const { u = "", tipo = "", t = "", listo, invalido } = await searchParams;
  const caja = "glass glass-solid mx-auto max-w-lg space-y-4 rounded-2xl p-6 text-center";

  if (listo && esTipoAviso(listo)) {
    return <section className={caja}><h1 className="text-xl font-bold text-slate-900">Listo</h1><p className="text-slate-600">Ya no vas a recibir por correo: <strong>{ETIQUETA_AVISO[listo]}</strong>. Los demás avisos siguen igual.</p><Link href="/mi-perfil" className="glass-btn inline-flex px-4 py-2 text-sm">Ver todos mis avisos</Link></section>;
  }
  if (invalido || !esTipoAviso(tipo) || !firmaValida(u, tipo, t)) {
    return <section className={caja}><h1 className="text-xl font-bold text-slate-900">El enlace no es válido</h1><p className="text-slate-600">Puede que esté incompleto. Podés elegir qué avisos recibir desde tu perfil.</p><Link href="/mi-perfil" className="glass-btn inline-flex px-4 py-2 text-sm">Ir a mi perfil</Link></section>;
  }
  return (
    <section className={caja}>
      <h1 className="text-xl font-bold text-slate-900">¿Dejar de recibir estos avisos?</h1>
      <p className="text-slate-600">Vas a dejar de recibir por correo: <strong>{ETIQUETA_AVISO[tipo]}</strong>. Los podés volver a activar desde tu perfil.</p>
      <form action={bajaDesdeEnlaceAction.bind(null, u, tipo, t)}>
        <button className="glass-btn px-4 py-2 text-sm">Dejar de recibirlos</button>
      </form>
    </section>
  );
}
