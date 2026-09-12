import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RecuperarClaveForm } from "@/components/auth/RecuperarClaveForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecuperarClavePage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  // Con sesión abierta la contraseña se cambia desde el perfil, no por correo.
  const user = await getSessionUser();
  if (user) redirect("/mi-perfil");

  return <RecuperarClaveForm enviado={enviado === "1"} />;
}
