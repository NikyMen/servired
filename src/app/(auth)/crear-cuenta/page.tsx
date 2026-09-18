import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getLocalidades } from "@/lib/localidades";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta" };

export default async function CrearCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string; tipo?: string }>;
}) {
  const { next, role, tipo } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;

  const user = await getSessionUser();
  if (user) redirect(safeNext || "/");

  const providerType = tipo === "profesional" || tipo === "oficio" ? tipo : undefined;
  const intendedNext = safeNext || (role === "profesional" || providerType ? `/pro${providerType ? `?tipo=${providerType}` : ""}` : undefined);
  const localidades = await getLocalidades();
  return <RegisterForm next={intendedNext} providerType={providerType} localities={localidades.map(({ id, name, province }) => ({ id, name, province }))} />;
}
