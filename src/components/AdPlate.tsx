import Link from "next/link";
import { waLink } from "@/lib/whatsapp";

type Ad = { title: string; imageUrl: string | null; whatsappPhone: string | null; whatsappMessage: string | null; enabled: boolean } | null;

/**
 * Una placa de publicidad. Siempre cuadrada, en cualquier pantalla y en
 * cualquier lugar de la portada: la imagen la llena entera (object-cover) sin
 * deformarse, así se ve igual que en la vista previa del panel.
 */
export function AdPlate({ ad, label, className = "", lazy = false }: { ad: Ad; label: string; className?: string; lazy?: boolean }) {
  const activa = Boolean(ad?.enabled);
  const content = activa && ad ? (
    <>
      {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title || label} loading={lazy ? "lazy" : undefined} className="absolute inset-0 size-full object-cover" /> : null}
      {ad.title ? <span className={`relative z-10 px-3 text-center text-xs font-semibold ${ad.imageUrl ? "rounded bg-black/55 py-1 text-white" : "text-slate-500"}`}>{ad.title}</span> : null}
      {!ad.imageUrl && !ad.title ? <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span> : null}
    </>
  ) : <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span>;

  const style = `relative flex aspect-square overflow-hidden items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white/70 shadow-sm ${className}`;
  const href = activa && ad?.whatsappPhone ? waLink(ad.whatsappPhone, ad.whatsappMessage) : null;
  return href
    ? <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}: abre WhatsApp`} className={style}>{content}</Link>
    : <aside aria-label={label} className={style}>{content}</aside>;
}
