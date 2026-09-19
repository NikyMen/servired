import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { AsistenteIA } from "@/components/AsistenteIA";
import { NoLeidosProvider } from "@/components/NoLeidos";
import { getSessionUser, pendienteDeAlta } from "@/lib/auth";
import { CompletarAlta } from "@/components/CompletarAlta";
import { UbicacionEnVivo } from "@/components/UbicacionEnVivo";
import { datosCompletarAlta } from "@/lib/completar-alta";
import { AyudaFlotante } from "@/components/AyudaFlotante";
import { getSoporte } from "@/lib/soporte";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, soporte] = await Promise.all([getSessionUser(), getSoporte()]);
  // Cuenta sin términos vigentes o sin localidad: la pantalla de aceptación tapa todo.
  const alta = user && pendienteDeAlta(user) ? await datosCompletarAlta(user) : null;

  return (
    // data-modo pinta el fondo azulado desde el CSS (ver globals.css).
    <div data-modo="cliente" className="mode-page flex min-h-screen flex-col">
      {/* Envuelve todo: el globito de sin leer lo miran el header, la barra
          inferior, el botón flotante y el chat, con un solo poll para todos. */}
      <NoLeidosProvider mode="cliente" activo={!!user}>
        {/* La ubicación en tiempo real se sigue solo con sesión: el invitado no ve el mapa. */}
        <UbicacionEnVivo activo={!!user && !alta}>
          <Header mode="cliente" user={user} />
          {/* pb extra en móvil: deja lugar a la barra de pestañas inferior */}
          <main className="animate-page-in mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            {children}
          </main>
          <Footer mode="cliente" />
          <BottomNav mode="cliente" />
          {/* Antes que los paneles flotantes: sus fondos lo tapan al abrirse. */}
          {soporte && <AyudaFlotante href={soporte.href} />}
          <AsistenteIA mode="cliente" />
        </UbicacionEnVivo>
      </NoLeidosProvider>
      {alta && <CompletarAlta {...alta} tono="cliente" />}
    </div>
  );
}
