import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;

  // Si ya hay sesión no tiene sentido mostrar el login.
  const user = await getSessionUser();
  if (user) redirect(safeNext || "/");

  // Hasta ahora los ?error= del callback de OAuth no se mostraban en ningún
  // lado y la persona veía el login limpio, sin saber por qué volvió acá.
  const aviso = error === "suspendida"
    ? "Tu cuenta está suspendida. Escribinos si creés que fue un error."
    : error === "oauth"
      ? "No pudimos completar el ingreso con ese proveedor. Probá de nuevo."
      : undefined;

  return <LoginForm next={safeNext} aviso={aviso} />;
}
