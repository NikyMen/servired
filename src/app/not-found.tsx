import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="glass glass-solid flex max-w-lg flex-col items-center rounded-[2rem] px-8 py-10">
        <Logo />
        <p className="mt-8 text-6xl font-extrabold text-cliente">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-slate-500">
          No pudimos encontrar lo que buscás. Puede que el profesional o la página ya no exista.
        </p>
        <Link href="/" className="glass-btn mt-6 px-5 py-2.5 text-sm">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
