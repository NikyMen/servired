import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

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
  return <RegisterForm next={intendedNext} providerType={providerType} />;
}
