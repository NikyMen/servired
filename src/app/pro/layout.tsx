import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { AsistenteIA } from "@/components/AsistenteIA";
import { MensajesFlotante } from "@/components/MensajesFlotante";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Modo profesional" };

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    // data-modo pinta el fondo verdoso desde el CSS (ver globals.css).
    <div data-modo="pro" className="flex min-h-screen flex-col">
      <Header mode="pro" user={user} />
      {/* pb extra en móvil: deja lugar a la barra de pestañas inferior */}
      <main className="animate-page-in mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      <Footer mode="pro" />
      <BottomNav mode="pro" />
      <AsistenteIA mode="pro" />
      {/* Sólo con sesión: sin cuenta no hay bandeja a la que ir. */}
      {user && <MensajesFlotante mode="pro" />}
    </div>
  );
}
