import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { FacebookIcon, SearchIcon, BriefcaseIcon, VerifiedIcon, ChatIcon } from "@/components/icons";
import { FACEBOOK_URL } from "@/lib/links";

/**
 * Marco de las pantallas de cuenta.
 *
 * El panel de la izquierda muestra los dos caminos con su color: azul para quien
 * contrata, verde para quien ofrece. Es el punto donde la persona elige de qué
 * lado de ServiRed está, así que los dos tienen que verse desde el primer segundo.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative isolate overflow-hidden bg-slate-900 px-6 py-10 text-white lg:px-12 lg:py-14">
        {/* Manchas de color: azul y verde, los dos lados conviviendo. */}
        <div
          aria-hidden
          className="animate-blob absolute -top-24 -left-20 -z-10 size-80 rounded-full bg-cliente/35 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-blob absolute -right-16 bottom-0 -z-10 size-96 rounded-full bg-pro/30 blur-3xl [animation-delay:-4s]"
        />

        <div className="flex h-full flex-col">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5">
            <LogoMark size={34} />
            <span className="text-2xl font-extrabold tracking-tight">
              SERVI<span className="text-blue-300">RED</span>
            </span>
          </Link>

          <div className="mt-8 lg:mt-auto lg:pt-12">
            <h1 className="max-w-md text-3xl leading-tight font-extrabold lg:text-4xl">
              Un lugar, dos caminos.
            </h1>
            <p className="mt-3 max-w-md text-slate-300">
              Entrá con tu cuenta y elegí de qué lado estás hoy. Podés cambiar
              cuando quieras.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-lg">
              <PathCard
                tone="cliente"
                icon={<SearchIcon width={20} height={20} />}
                title="Contratás"
                lines={["Buscá profesionales verificados", "Pedí y compará presupuestos"]}
              />
              <PathCard
                tone="pro"
                icon={<BriefcaseIcon width={20} height={20} />}
                title="Ofrecés"
                lines={["Publicá tus servicios", "Recibí pedidos de clientes"]}
              />
            </div>

            <ul className="mt-8 hidden gap-6 text-sm text-slate-400 lg:flex">
              <li className="flex items-center gap-2">
                <VerifiedIcon width={16} height={16} className="text-pro" />
                Perfiles verificados
              </li>
              <li className="flex items-center gap-2">
                <ChatIcon width={16} height={16} className="text-cliente" />
                Mensajería directa
              </li>
            </ul>
          </div>

          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex w-fit items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white lg:mt-10"
          >
            <FacebookIcon width={18} height={18} />
            Seguinos en Facebook
          </a>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-5 py-10 lg:px-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

function PathCard({
  tone,
  icon,
  title,
  lines,
}: {
  tone: "cliente" | "pro";
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  const isPro = tone === "pro";
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-sm ${
        isPro ? "border-pro/40 bg-pro/10" : "border-cliente/40 bg-cliente/10"
      }`}
    >
      <span
        className={`inline-flex size-9 items-center justify-center rounded-xl text-white ${
          isPro ? "bg-pro" : "bg-cliente"
        }`}
      >
        {icon}
      </span>
      <p className="mt-3 font-bold">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {lines.map((l) => (
          <li key={l} className="text-xs text-slate-300">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
