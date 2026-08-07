import Link from "next/link";

/**
 * Aviso de "estás mirando sin cuenta".
 *
 * La app se puede recorrer entera sin entrar: las dos mitades, todos los
 * paneles, todos los perfiles. Lo único que sigue pidiendo cuenta es escribir
 * — contratar, mensajear, responder una solicitud — porque cada una de esas
 * cosas necesita un dueño en la base (una propuesta sin cliente no es nada) y
 * porque el rol tiene que salir de la sesión y no del navegador.
 *
 * Por eso este cartel no bloquea: explica por qué lo que estás viendo está
 * vacío y ofrece la salida. Antes, en su lugar, había un redirect a /entrar.
 */
export function InvitadoAviso({
  accion,
  next,
}: {
  /** Qué es lo que no vas a poder hacer, en infinitivo. */
  accion: string;
  /** A dónde volver después de entrar. */
  next: string;
}) {
  return (
    <div className="glass glass-thin flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          Estás mirando como invitado
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          Podés recorrer todo sin cuenta. Para {accion} necesitás entrar.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href={`/entrar?next=${encodeURIComponent(next)}`}
          className="glass-btn px-4 py-2 text-sm"
        >
          Entrar
        </Link>
        <Link href="/crear-cuenta" className="glass-btn glass-btn-ghost px-4 py-2 text-sm">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
