import type { Metadata, Viewport } from "next";
import { ModeTransition } from "@/components/ModeTransition";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Cubre los notch/safe-areas de iOS; el layout compensa con env(safe-area-inset-*)
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: "ServiRed — Encontrá al profesional ideal",
    template: "%s · ServiRed",
  },
  description:
    "Marketplace de servicios que conecta personas con profesionales verificados: plomería, electricidad, limpieza, jardinería y más.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {/* Vive acá y no en cada layout: el layout raíz no se desmonta al
            navegar, así que es el único que puede notar el cambio de modo. */}
        <ModeTransition />
        {children}
      </body>
    </html>
  );
}
