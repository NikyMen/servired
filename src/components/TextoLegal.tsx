import type { Bloque } from "@/lib/site-text";

/** Dibuja los bloques de `parseTexto`. Lo usan la página de términos y la pantalla de aceptación. */
export function TextoLegal({ bloques }: { bloques: Bloque[] }) {
  return (
    <>
      {bloques.map((bloque, index) => {
        if (bloque.tipo === "titulo") return <h2 key={index} className="pt-2 text-lg font-bold text-slate-900">{bloque.texto}</h2>;
        if (bloque.tipo === "lista") {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-600 sm:text-base">
              {bloque.items.map((item, posicion) => <li key={posicion}>{item}</li>)}
            </ul>
          );
        }
        return <p key={index} className="text-sm leading-6 text-slate-600 sm:text-base">{bloque.texto}</p>;
      })}
    </>
  );
}
