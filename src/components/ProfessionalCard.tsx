import Link from "next/link";
import type { ProCard } from "@/lib/types";
import { formatARS } from "@/lib/format";
import { Avatar, Rating, VerifiedBadge } from "@/components/ui";
import { HeartIcon, MapPinIcon } from "@/components/icons";

export function ProfessionalCard({ pro }: { pro: ProCard }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
      {/* Portada */}
      <div
        className="relative flex h-32 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${pro.avatarColor} 0%, ${pro.avatarColor}cc 100%)`,
        }}
      >
        <span className="text-5xl opacity-90">{pro.category.icon}</span>
        <button
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:text-brandred"
          aria-label="Guardar en favoritos"
        >
          <HeartIcon width={18} height={18} />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-4">
        <div className="-mt-9 mb-2 flex items-end gap-2">
          <Avatar name={pro.name} color={pro.avatarColor} size={44} ring />
        </div>

        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-navy-900">{pro.name}</h3>
          {pro.verified && <VerifiedBadge />}
        </div>
        <p className="text-sm text-slate-500">{pro.headline}</p>

        <div className="mt-2">
          <Rating value={pro.rating} count={pro.reviewsCount} />
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
          <MapPinIcon width={15} height={15} className="text-slate-400" />
          {pro.zone}
        </div>

        <p className="mt-2 text-sm text-slate-600">
          Desde <span className="font-semibold text-navy-900">{formatARS(pro.priceFrom)}</span>
        </p>

        <Link
          href={`/profesionales/${pro.id}`}
          className="mt-4 block rounded-xl bg-navy-800 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-navy-700"
        >
          Ver perfil
        </Link>
      </div>
    </article>
  );
}
