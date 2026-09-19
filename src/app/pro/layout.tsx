import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { AsistenteIA } from "@/components/AsistenteIA";
import { NoLeidosProvider } from "@/components/NoLeidos";
import { getSessionUser, pendienteDeAlta } from "@/lib/auth";
import { CompletarAlta } from "@/components/CompletarAlta";
import { datosCompletarAlta } from "@/lib/completar-alta";
import { AyudaFlotante } from "@/components/AyudaFlotante";
import { getSoporte } from "@/lib/soporte";

export const metadata: Metadata = { title: "Modo profesional" };

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, soporte] = await Promise.all([getSessionUser(), getSoporte()]);
  // Cuenta sin términos vigentes o sin localidad: la pantalla de aceptación tapa todo.
  const alta = user && pendienteDeAlta(user) ? await datosCompletarAlta(user) : null;

  return (
    // data-modo pinta el fondo verdoso desde el CSS (ver globals.css).
    <div data-modo="pro" className="mode-page flex min-h-screen flex-col">
      {/* Ver el layout de cliente: un solo poll de sin leer para toda la pantalla. */}
      <NoLeidosProvider mode="pro" activo={!!user?.professionalId}>
        <Header mode="pro" user={user} />
        {/* pb extra en móvil: deja lugar a la barra de pestañas inferior */}
        <main className="animate-page-in mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <Footer mode="pro" />
        <BottomNav mode="pro" />
        {/* Antes que los paneles flotantes: sus fondos lo tapan al abrirse. */}
        {soporte && <AyudaFlotante href={soporte.href} />}
        <AsistenteIA mode="pro" />
      </NoLeidosProvider>
      {alta && <CompletarAlta {...alta} tono="pro" />}
    </div>
  );
}
