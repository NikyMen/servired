import type { Metadata } from "next";
import { formatDate } from "@/lib/format";
import { TERMS_DEFAULT, TERMS_SLUG, getSiteText, parseTexto } from "@/lib/site-text";
import { TextoLegal } from "@/components/TextoLegal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Términos y condiciones" };

export default async function TerminosPage() {
  const texto = await getSiteText(TERMS_SLUG, TERMS_DEFAULT);
  const bloques = parseTexto(texto.body);

  return (
    <article className="glass glass-solid mx-auto max-w-3xl space-y-4 rounded-2xl p-5 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{texto.title}</h1>
      <TextoLegal bloques={bloques} />
      {texto.updatedAt && (
        <p className="border-t border-white/60 pt-4 text-xs text-slate-400">Última modificación: {formatDate(texto.updatedAt)}</p>
      )}
    </article>
  );
}
