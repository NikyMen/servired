import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  ChatIcon,
  HelpIcon,
  ChevronDownIcon,
} from "@/components/icons";

function TopIcon({
  children,
  label,
  count,
}: {
  children: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button className="relative hidden flex-col items-center text-slate-500 hover:text-navy-900 sm:flex">
      <span className="relative">
        {children}
        {count != null && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brandred px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </span>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

export function PanelTopbar({ name, role }: { name: string; role: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-4 px-4 py-3">
        <button className="text-slate-500 hover:text-navy-900">
          <MenuIcon />
        </button>
        <Logo />

        <div className="ml-2 hidden flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 md:flex">
          <SearchIcon className="text-slate-400" width={18} height={18} />
          <input
            placeholder="Buscar servicios, clientes, solicitudes…"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="ml-auto flex items-center gap-5">
          <TopIcon label="Alertas" count={3}>
            <BellIcon width={22} height={22} />
          </TopIcon>
          <TopIcon label="Mensajes" count={2}>
            <ChatIcon width={22} height={22} />
          </TopIcon>
          <TopIcon label="Ayuda">
            <HelpIcon width={22} height={22} />
          </TopIcon>
          <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100">
            <Avatar name={name} color="#0F2A52" size={34} />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-navy-900">{name}</span>
              <span className="block text-xs leading-tight text-slate-400">{role}</span>
            </span>
            <ChevronDownIcon width={16} height={16} className="text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
