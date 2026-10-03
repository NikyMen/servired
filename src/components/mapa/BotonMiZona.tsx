import Link from "next/link";

/** Adónde lleva el botón: la sección de la zona en Mi perfil del pro. */
export const EDITAR_ZONA_HREF = "/pro/mi-perfil#ubicacion";

/**
 * Para quien ofrece servicios: lleva a editar su zona de trabajo. Va encima
 * del mapa, debajo de "Ubicarme ahora"; en el celular es solo el ícono.
 */
export function BotonMiZona({ className = "" }: { className?: string }) {
  return (
    <Link
      href={EDITAR_ZONA_HREF}
      aria-label="Editar mi zona de trabajo"
      title="Editar mi zona de trabajo"
      className={`glass glass-solid absolute z-[500] flex size-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-pro-dark shadow-lg sm:size-auto sm:px-3 sm:py-2 ${className}`}
    >
      <span aria-hidden className="block size-3.5 rounded-full border-2 border-pro bg-pro/25" />
      <span className="hidden sm:inline">Mi zona de trabajo</span>
    </Link>
  );
}
