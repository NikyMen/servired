import Link from "next/link";

type Ad = { title: string; imageUrl: string | null; linkUrl: string | null; enabled: boolean } | null;

export function AdPlate({ ad, label, className = "" }: { ad: Ad; label: string; className?: string }) {
  const content = ad?.enabled ? (
    <>
      {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="absolute inset-0 size-full object-cover" /> : null}
      <span className={`relative z-10 px-3 text-center text-xs font-semibold ${ad.imageUrl ? "rounded bg-black/55 py-1 text-white" : "text-slate-500"}`}>{ad.title}</span>
    </>
  ) : <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span>;

  const style = `relative flex overflow-hidden items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white/70 shadow-sm ${className}`;
  return ad?.enabled && ad.linkUrl
    ? <Link href={ad.linkUrl} aria-label={label} className={style}>{content}</Link>
    : <aside aria-label={label} className={style}>{content}</aside>;
}
