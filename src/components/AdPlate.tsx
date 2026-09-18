import Link from "next/link";
import { waLink } from "@/lib/whatsapp";
import { TIPOS_PLACA, type TipoPlaca } from "@/lib/publicidad";

type Ad = { title: string; imageUrl: string | null; whatsappPhone: string | null; whatsappMessage: string | null; enabled: boolean } | null;

/**
 * Una placa de publicidad. La forma sale del tipo y es la misma en cualquier
 * pantalla; la imagen la llena siempre (object-cover) sin deformarse, así se
 * ve igual que en la vista previa del panel.
 */
export function AdPlate({ ad, tipo, label, className = "", lazy = false }: { ad: Ad; tipo: TipoPlaca; label: string; className?: string; lazy?: boolean }) {
  const { ancho, alto } = TIPOS_PLACA[tipo];
  const activa = Boolean(ad?.enabled);
  const content = activa && ad ? (
    <>
      {ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title || label} loading={lazy ? "lazy" : undefined} className="absolute inset-0 size-full object-cover" /> : null}
      {ad.title ? <span className={`relative z-10 px-3 text-center text-xs font-semibold ${ad.imageUrl ? "rounded bg-black/55 py-1 text-white" : "text-slate-500"}`}>{ad.title}</span> : null}
      {!ad.imageUrl && !ad.title ? <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span> : null}
    </>
  ) : <span className="text-xs font-semibold tracking-[0.2em] text-slate-400">ADS</span>;

  const style = `relative flex overflow-hidden items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white/70 shadow-sm ${className}`;
  const href = activa && ad?.whatsappPhone ? waLink(ad.whatsappPhone, ad.whatsappMessage) : null;
  const aspecto = { aspectRatio: `${ancho} / ${alto}` };
  return href
    ? <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}: abre WhatsApp`} className={style} style={aspecto}>{content}</Link>
    : <aside aria-label={label} className={style} style={aspecto}>{content}</aside>;
}
