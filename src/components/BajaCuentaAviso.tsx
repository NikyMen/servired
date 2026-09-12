import Link from "next/link";

/** Entrada a la baja desde la configuración del perfil, en los dos modos. */
export function BajaCuentaAviso() {
  return (
    <section className="glass glass-thin flex flex-wrap items-center justify-between gap-3 rounded-2xl border-red-200/70 bg-red-50/40 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Dar de baja la cuenta</p>
        <p className="text-xs text-slate-500">Se borra todo lo tuyo y no hay vuelta atrás.</p>
      </div>
      <Link href="/baja-de-cuenta" className="glass-btn glass-btn-ghost shrink-0 px-4 py-2 text-sm text-red-700">
        Quiero darme de baja
      </Link>
    </section>
  );
}
