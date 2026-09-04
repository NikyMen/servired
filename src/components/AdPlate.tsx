import Link from "next/link";

type Ad = { title: string; imageUrl: string | null; whatsappPhone: string | null; whatsappMessage: string | null; enabled: boolean } | null;

function whatsappLink(phone: string, message: string | null) {
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/549${phone}${query}`;
}

export function AdPlate({ ad, label, className = "" }: { ad: Ad; label: string; className?: string }) {
  const content = ad?.enabled ? (
    <>
      {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title} className="absolute inset-0 size-full object-cover" /> : null}
      <span className={`relative z-10 px-3 text-center text-xs font-semibold ${ad.imageUrl ? "rounded bg-black/55 py-1 text-white" : "text-slate-500"}`}>{ad.title}</span>
    </>
  ) : <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span>;

  const style = `relative flex overflow-hidden items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white/70 shadow-sm ${className}`;
  const href = ad?.enabled && ad.whatsappPhone ? whatsappLink(ad.whatsappPhone, ad.whatsappMessage) : null;
  return href
    ? <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={style}>{content}</Link>
    : <aside aria-label={label} className={style}>{content}</aside>;
}
