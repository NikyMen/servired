import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Si ya hay sesión no tiene sentido mostrar el login.
  const user = await getSessionUser();
  if (user) redirect(user.role === "profesional" ? "/pro" : "/");

  return <LoginForm next={next} />;
}
