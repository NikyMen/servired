import { CLIENT_BLUE, PRO_GREEN } from "@/lib/brand";

export type FondoLiquidoProps = {
  className?: string;
  variante?: "portada" | "marca";
};

/** Conserva la paleta del fondo sin descargar ni ejecutar una simulación WebGL. */
export function FondoLiquido({ className = "", variante = "marca" }: FondoLiquidoProps) {
  const portada = variante === "portada";
  return <div className={className} aria-hidden style={{ background: `radial-gradient(ellipse at 20% 30%, ${portada ? "#1d4ed8" : CLIENT_BLUE}99, transparent 65%), radial-gradient(ellipse at 80% 70%, ${portada ? "#34d399" : PRO_GREEN}80, transparent 65%), radial-gradient(ellipse at 60% 20%, #38bdf870, transparent 60%)` }} />;
}
