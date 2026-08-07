import Link from "next/link";
import type { ProCard } from "@/lib/types";
import { formatARS } from "@/lib/format";
import { Avatar, Rating, VerifiedBadge } from "@/components/ui";
import { MapPinIcon } from "@/components/icons";

export function ProfessionalCard({ pro }: { pro: ProCard }) {
  return (
    <Link
      href={`/profesionales/${pro.id}`}
      className="glass glass-card group flex flex-col rounded-[1.5rem] p-4"
    >
      <div className="flex items-center gap-3">
        <Avatar name={pro.name} color={pro.avatarColor} size={48} />
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
        <Rating value={pro.rating} count={pro.reviewsCount} />
        <span className="flex items-center gap-1 text-slate-500">
          <MapPinIcon width={14} height={14} className="text-slate-400" />
          {pro.zone}
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-white/70 pt-3 text-sm">
        <p className="flex items-center justify-between text-slate-500">
          <span>Último trabajo realizado</span>
          <span className="font-semibold text-slate-900">
            {pro.lastWorkPrice != null ? formatARS(pro.lastWorkPrice) : "A convenir"}
          </span>
        </p>
        <p className="text-xs text-pro-dark">
          {pro.completedJobs} {pro.completedJobs === 1 ? "trabajo realizado" : "trabajos realizados"} en ServiRed
        </p>
      </div>
    </Link>
  );
}
