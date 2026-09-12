import type { Metadata } from "next";
import Link from "next/link";
import { NuevaClaveForm } from "@/components/auth/NuevaClaveForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nueva contraseña" };

/**
 * El token no se valida acá: se valida al guardar. Mirarlo antes obligaría a
 * decir "este enlace no sirve" sin saber siquiera si quien entró es la persona,
 * y el mensaje de error del formulario ya cubre el caso.
 */
export default async function NuevaClavePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="animate-page-in">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Enlace incompleto</h2>
        <p className="mt-2 text-sm text-slate-500">Abrí el enlace tal como llegó al correo, o pedí uno nuevo.</p>
        <Link href="/recuperar-clave" className="glass-btn mt-4 inline-flex px-4 py-2.5 text-sm">Pedir otro enlace</Link>
      </div>
    );
  }
  return <NuevaClaveForm token={token} />;
}
