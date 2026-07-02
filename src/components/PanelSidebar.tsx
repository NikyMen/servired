"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import {
  GridIcon,
  BriefcaseIcon,
  ClipboardIcon,
  CheckCircleIcon,
  CalendarIcon,
  ChatIcon,
  UsersIcon,
  StarIcon,
  ChartIcon,
  GearIcon,
  LogoutIcon,
} from "@/components/icons";

const nav = [
  { key: "resumen", label: "Resumen", icon: GridIcon },
  { key: "servicios", label: "Mis servicios", icon: BriefcaseIcon },
  { key: "solicitudes", label: "Solicitudes", icon: ClipboardIcon, badge: 5 },
  { key: "contrataciones", label: "Contrataciones", icon: CheckCircleIcon },
  { key: "agenda", label: "Agenda", icon: CalendarIcon },
  { key: "mensajes", label: "Mensajes", icon: ChatIcon },
  { key: "clientes", label: "Clientes", icon: UsersIcon },
  { key: "opiniones", label: "Opiniones", icon: StarIcon },
  { key: "finanzas", label: "Mis finanzas", icon: ChartIcon },
  { key: "promociones", label: "Promociones", icon: StarIcon },
  { key: "ajustes", label: "Ajustes", icon: GearIcon },
];

export function PanelSidebar({ name, role }: { name: string; role: string }) {
  const [active, setActive] = useState("servicios");

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">
      {/* Tarjeta de perfil */}
      <div className="rounded-2xl bg-navy-800 p-4 text-white">
        <div className="flex items-center gap-3">
          <Avatar name={name} color="#1B4DA0" size={44} ring />
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-white/70">{role}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
          <CheckCircleIcon width={14} height={14} /> Verificado
        </p>
      </div>

      {/* Navegación */}
      <nav className="rounded-2xl border border-slate-200 bg-white p-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-blue/10 text-brand-blue"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
              }`}
            >
              <Icon width={20} height={20} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brandred px-1 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
        <Link
          href="/"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brandred transition-colors hover:bg-red-50"
        >
          <LogoutIcon width={20} height={20} />
          Cerrar sesión
        </Link>
      </nav>
    </aside>
  );
}
