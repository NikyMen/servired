/**
 * Marca fija del entorno de prueba (servired.consultoriadigital.io). No tapa
 * nada que se toque: es chica, va arriba al centro y deja pasar los clics.
 */
export function FranjaPrueba() {
  return (
    <div role="note" className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center pt-[env(safe-area-inset-top)]">
      <span className="rounded-b-lg bg-fuchsia-600 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-md">Entorno de prueba</span>
    </div>
  );
}
