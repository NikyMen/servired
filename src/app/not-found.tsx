import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <Logo withTagline />
      <p className="mt-8 text-6xl font-extrabold text-brand-blue">404</p>
      <h1 className="mt-2 text-2xl font-bold text-navy-900">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-slate-500">
        No pudimos encontrar lo que buscás. Puede que el profesional o la página ya no exista.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
