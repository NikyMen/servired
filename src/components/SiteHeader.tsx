import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import {
  SearchIcon,
  MapPinIcon,
  HeartIcon,
  ChatIcon,
  BellIcon,
  ChevronDownIcon,
} from "@/components/icons";

function IconWithBadge({
  children,
  label,
  count,
}: {
  children: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button className="relative flex flex-col items-center gap-1 text-slate-500 transition-colors hover:text-navy-900">
      <span className="relative">
        {children}
        {count != null && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brandred px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </span>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 lg:px-6">
        <Logo withTagline className="shrink-0" />

        {/* Buscador */}
        <form
          action="/buscar"
          className="ml-2 hidden flex-1 items-center rounded-xl border border-slate-300 bg-white pl-2 md:flex"
        >
          <label className="flex items-center gap-1 border-r border-slate-200 px-2 text-sm text-slate-600">
            <select
              name="categoria"
              className="max-w-[110px] cursor-pointer bg-transparent py-2.5 text-sm outline-none"
              defaultValue=""
            >
              <option value="">Servicios</option>
              <option value="plomeria">Plomería</option>
              <option value="electricidad">Electricidad</option>
              <option value="limpieza">Limpieza</option>
              <option value="jardineria">Jardinería</option>
              <option value="pintura">Pintura</option>
            </select>
          </label>
          <div className="flex flex-1 items-center gap-2 px-3">
            <SearchIcon className="text-slate-400" width={18} height={18} />
            <input
              name="q"
              placeholder="¿Qué servicio necesitás?"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 px-3">
            <MapPinIcon className="text-slate-400" width={18} height={18} />
            <input
              name="ubicacion"
              placeholder="Ubicación"
              className="w-28 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="m-1 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue/90"
          >
            <SearchIcon width={16} height={16} />
            Buscar
          </button>
        </form>

        {/* Acciones */}
        <div className="ml-auto flex items-center gap-5">
          <div className="hidden items-center gap-5 lg:flex">
            <IconWithBadge label="Favoritos">
              <HeartIcon width={22} height={22} />
            </IconWithBadge>
            <IconWithBadge label="Mensajes" count={2}>
              <ChatIcon width={22} height={22} />
            </IconWithBadge>
            <IconWithBadge label="Notificaciones" count={3}>
              <BellIcon width={22} height={22} />
            </IconWithBadge>
          </div>
          <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100">
            <Avatar name="María G." color="#2E6FB8" size={34} />
            <span className="hidden text-sm font-medium text-navy-900 sm:block">María G.</span>
            <ChevronDownIcon width={16} height={16} className="text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
