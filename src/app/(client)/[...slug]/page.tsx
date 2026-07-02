import Link from "next/link";
import { CompassIcon } from "@/components/icons";

const labels: Record<string, string> = {
  "mis-solicitudes": "Mis solicitudes",
  "mis-contrataciones": "Mis contrataciones",
  favoritos: "Favoritos",
  mensajes: "Mensajes",
  pagos: "Pagos y facturas",
  "mi-perfil": "Mi perfil",
};

export default async function StubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const key = slug?.[0] ?? "";
  const title = labels[key] ?? "Sección";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
        <CompassIcon width={32} height={32} />
      </span>
      <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
      <p className="mt-2 max-w-md text-slate-500">
        Esta sección está en construcción. En esta primera versión de ServiRed ya
        podés explorar servicios, ver perfiles de profesionales y usar el panel del
        profesional.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-navy-900 hover:bg-slate-50">
          Volver al inicio
        </Link>
        <Link href="/buscar" className="rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-blue/90">
          Explorar servicios
        </Link>
      </div>
    </div>
  );
}
