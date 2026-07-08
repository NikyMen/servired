import Link from "next/link";
import type { ProCard } from "@/lib/types";
import { formatARS } from "@/lib/format";
import { Avatar, Rating, VerifiedBadge } from "@/components/ui";
import { MapPinIcon } from "@/components/icons";

export function ProfessionalCard({ pro }: { pro: ProCard }) {
  return (
    <Link
      href={`/profesionales/${pro.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <Avatar name={pro.name} color={pro.avatarColor} size={48} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold text-slate-900 group-hover:text-pro-dark">
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

      <p className="mt-2 text-sm text-slate-600">
        Desde <span className="font-semibold text-slate-900">{formatARS(pro.priceFrom)}</span>
      </p>
    </Link>
  );
}
