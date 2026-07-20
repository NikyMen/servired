import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta" };

export default async function CrearCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const user = await getSessionUser();
  if (user) redirect(user.role === "profesional" ? "/pro" : "/");

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true, icon: true },
  });

  return <RegisterForm categories={categories} next={next} />;
}
