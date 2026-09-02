import Link from "next/link";
import type { ProCard } from "@/lib/types";
import { Avatar, Rating, VerifiedBadge } from "@/components/ui";
import { MapPinIcon } from "@/components/icons";

export function ProfessionalCard({ pro }: { pro: ProCard }) {
  return (
    <Link
      href={`/profesionales/${pro.id}`}
      className="glass glass-card group flex flex-col rounded-[1.5rem] p-4"
    >
      <div className="flex items-center gap-3">
        <Avatar name={pro.name} color={pro.avatarColor} src={pro.avatarUrl} size={48} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold text-slate-900 transition-colors group-hover:text-[var(--accent-dark)]">
              {pro.name}
            </h3>
            {pro.verified && <VerifiedBadge />}
          </div>
          <p className="truncate text-sm text-slate-500">
            {pro.category.icon} {pro.headline}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-800"><Rating value={pro.rating} count={pro.reviewsCount} /></span>
        <span className="flex items-center gap-1 text-slate-500">
          <MapPinIcon width={14} height={14} className="text-slate-400" />
          {pro.zone}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
        {pro.bio || `Servicios de ${pro.headline} en ${pro.zone}.`}
      </p>

      <div className="mt-3 border-t border-white/70 pt-3">
        <p className="text-base font-extrabold text-pro-dark">{pro.completedJobs} {pro.completedJobs === 1 ? "trabajo hecho" : "trabajos hechos"} en ServiRed</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{pro.externalJobs} {pro.externalJobs === 1 ? "trabajo mostrado" : "trabajos mostrados"} fuera de ServiRed · {pro.providerType}</p>
      </div>
    </Link>
  );
}
