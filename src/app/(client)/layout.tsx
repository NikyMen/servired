import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { AsistenteIA } from "@/components/AsistenteIA";
import { getSessionUser } from "@/lib/auth";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    // data-modo pinta el fondo azulado desde el CSS (ver globals.css).
    <div data-modo="cliente" className="flex min-h-screen flex-col">
      <Header mode="cliente" user={user} />
      {/* pb extra en móvil: deja lugar a la barra de pestañas inferior */}
      <main className="animate-page-in mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      <Footer mode="cliente" />
      <BottomNav mode="cliente" />
      <AsistenteIA mode="cliente" />
    </div>
  );
}
