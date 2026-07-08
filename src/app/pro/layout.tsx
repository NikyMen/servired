import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = { title: "Modo profesional" };

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Header mode="pro" />
      {/* pb extra en móvil: deja lugar a la barra de pestañas inferior */}
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:pb-8">{children}</main>
      <BottomNav mode="pro" />
    </div>
  );
}
