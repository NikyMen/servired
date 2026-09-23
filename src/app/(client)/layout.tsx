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
import { AdsCostados } from "@/components/AdsCostados";
import { getSoporte } from "@/lib/soporte";
import { calificacionPendiente } from "@/lib/calificacion";
import { CalificarObligatorio } from "@/components/CalificarObligatorio";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, soporte] = await Promise.all([getSessionUser(), getSoporte()]);
  // Cuenta sin términos vigentes o sin localidad: la pantalla de aceptación tapa todo.
  const alta = user && pendienteDeAlta(user) ? await datosCompletarAlta(user) : null;
  // Trabajo pagado sin calificar: hay que calificarlo para seguir (va después del alta).
  const calificar = user && !alta ? await calificacionPendiente(user.id) : null;

  return (
    // data-modo pinta el fondo azulado desde el CSS (ver globals.css).
    // overflow-x-clip: red de seguridad para lo que se sale del ancho del
    // contenido (100vw incluye la barra de scroll). "clip" se come ese sobrante
    // sin crear scroll horizontal y, a diferencia de overflow:hidden, no rompe
    // los sticky ni los fijos: las franjas de publicidad de los costados son
    // fijas y entran enteras en el ancho de la pantalla.
    <div data-modo="cliente" className="mode-page flex min-h-screen flex-col overflow-x-clip">
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
          {/* Las 3 placas de cada costado. Van acá y no en la portada porque
              acompañan el scroll en todas las pantallas del sitio; en el
              celular no se ven (las 12 están juntas debajo de la portada). */}
          <AdsCostados />
          <Footer mode="cliente" soporte={soporte} />
          <BottomNav mode="cliente" />
          {/* Antes que los paneles flotantes: sus fondos lo tapan al abrirse. */}
          {soporte && <AyudaFlotante href={soporte.href} />}
          <AsistenteIA mode="cliente" />
        </UbicacionEnVivo>
      </NoLeidosProvider>
      {alta && <CompletarAlta {...alta} tono="cliente" />}
      {calificar && <CalificarObligatorio key={calificar.paymentId} pendiente={calificar} />}
    </div>
  );
}
