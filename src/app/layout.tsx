import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ServiRed — Encontrá al profesional ideal",
    template: "%s · ServiRed",
  },
  description:
    "Marketplace de servicios que conecta personas con profesionales verificados: plomería, electricidad, limpieza, jardinería y más. Pagos seguros y opiniones reales.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
