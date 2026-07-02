import Link from "next/link";
import type { CategoryItem } from "@/lib/types";
import { GridIcon } from "@/components/icons";

export function CategoryChips({
  categories,
  active,
  max = 6,
}: {
  categories: CategoryItem[];
  active?: string;
  max?: number;
}) {
  const shown = categories.slice(0, max);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Todos */}
      <Link
        href="/buscar"
        className={`flex w-20 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
          !active
            ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        }`}
      >
        <GridIcon width={22} height={22} />
        <span className="text-xs font-medium">Todos</span>
      </Link>

      {shown.map((c) => (
        <Link
          key={c.slug}
          href={`/buscar?categoria=${c.slug}`}
          className={`flex w-20 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
            active === c.slug
              ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          <span className="text-2xl leading-none">{c.icon}</span>
          <span className="text-xs font-medium">{c.name}</span>
        </Link>
      ))}

      {categories.length > max && (
        <Link
          href="/buscar"
          className="flex w-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-slate-600 transition-colors hover:border-slate-300"
        >
          <span className="text-2xl leading-none">•••</span>
          <span className="text-xs font-medium">Ver más</span>
        </Link>
      )}
    </div>
  );
}
