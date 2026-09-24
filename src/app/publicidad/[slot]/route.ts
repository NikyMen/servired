import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Tocar una placa de publicidad pasa por acá: sin sesión, primero a entrar (y
 * después de loguearse vuelve a esta misma ruta); con sesión, directo al
 * WhatsApp del anunciante. El número nunca queda en el HTML de la portada.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/publicidad/${slot}`)}`);

  const ad = await prisma.ad.findUnique({ where: { slot }, select: { enabled: true, whatsappPhone: true, whatsappMessage: true } });
  if (!ad?.enabled || !ad.whatsappPhone) redirect("/");
  redirect(waLink(ad.whatsappPhone, ad.whatsappMessage));
}
