import Link from "next/link";
import { waLink } from "@/lib/whatsapp";

type Ad = { title: string; imageUrl: string | null; whatsappPhone: string | null; whatsappMessage: string | null; enabled: boolean } | null;

/** El lugar libre: en vez de un cartel muerto, invita a contratarlo. */
function Disponible() {
  return (
    <span className="flex flex-col items-center gap-0.5 px-1 text-center leading-tight">
      <span aria-hidden className="text-base sm:text-lg">💬</span>
      <span className="text-[11px] font-bold text-slate-600 sm:text-xs">Tu publicidad acá</span>
      <span className="text-[10px] font-semibold text-emerald-600 sm:text-[11px]">Contactanos</span>
    </span>
  );
}

/**
 * Una placa de publicidad. Siempre cuadrada, en cualquier pantalla y en
 * cualquier lugar de la portada: la imagen la llena entera (object-cover) sin
 * deformarse, así se ve igual que en la vista previa del panel.
 *
 * Sin aviso cargado la placa queda libre: con `invitarHref` invita a contratarla
 * por WhatsApp, y sin él (no hay número de soporte) muestra el "ADS" de antes.
 */
export function AdPlate({ ad, label, className = "", lazy = false, invitarHref = null }: { ad: Ad; label: string; className?: string; lazy?: boolean; invitarHref?: string | null }) {
  const activa = Boolean(ad?.enabled);
  const conAviso = activa && ad && (Boolean(ad.imageUrl) || Boolean(ad.title));
  const libre = !conAviso;
  const vacia = invitarHref ? <Disponible /> : <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span>;

  const content = conAviso ? (
    <>
      {ad!.imageUrl ? <img src={ad!.imageUrl} alt={ad!.title || label} loading={lazy ? "lazy" : undefined} className="absolute inset-0 size-full object-cover" /> : null}
      {ad!.title ? <span className={`relative z-10 px-3 text-center text-xs font-semibold ${ad!.imageUrl ? "rounded bg-black/55 py-1 text-white" : "text-slate-500"}`}>{ad!.title}</span> : null}
    </>
  ) : vacia;

  const borde = libre && invitarHref ? "border-dashed border-slate-300 bg-white/60 hover:border-emerald-400 hover:bg-emerald-50/70" : "border-slate-200 bg-white/70";
  const style = `relative flex aspect-square overflow-hidden items-center justify-center rounded-[1.5rem] border shadow-sm ${borde} ${className}`;
  const href = conAviso && ad!.whatsappPhone ? waLink(ad!.whatsappPhone, ad!.whatsappMessage) : libre ? invitarHref : null;
  const aria = conAviso ? `${label}: abre WhatsApp` : `${label}: espacio disponible, abre WhatsApp`;
  return href
    ? <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={aria} className={style}>{content}</Link>
    : <aside aria-label={label} className={style}>{content}</aside>;
}
