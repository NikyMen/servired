import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { Avatar, StatusPill } from "@/components/ui";
import { EncabezadoPerfil } from "@/components/pro/EncabezadoPerfil";
import { TrabajosParticulares } from "@/components/pro/TrabajosParticulares";
import { BookingActions } from "@/components/BookingActions";
import { SolicitudCard } from "@/components/pro/SolicitudCard";
import { InvitadoAviso } from "@/components/InvitadoAviso";
import { ChatIcon, ChevronLeftIcon } from "@/components/icons";
import { expirePendingProposals } from "@/lib/workflow";
import { ProfessionalOnboardingForm } from "@/components/ProfessionalOnboardingForm";
import { redirect } from "next/navigation";
import { decryptKyc } from "@/lib/kyc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel del profesional" };

export default async function ProPanelPage({ searchParams }: { searchParams: Promise<{ tipo?: string; editarKyc?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/pro");
  if (!user.emailVerified || !user.canInteract) redirect("/onboarding?next=/pro");
  const { tipo, editarKyc } = await searchParams;
  await expirePendingProposals();
  const pro = user?.professionalId
    ? await prisma.professional.findUnique({ where: { id: user.professionalId }, include: { categoryLinks: { where: { category: { approvalStatus: "approved" } } }, user: { select: { kycCase: { select: { status: true, reviewReason: true, legalName: true, phone: true, birthDate: true, cuilEncrypted: true, dniEncrypted: true, address: true } } } } } })
    : null;
  if (!pro || pro.profileStatus === "changes_requested" || (pro.profileStatus === "approved" && editarKyc === "1")) {
    const categories = await prisma.category.findMany({ where: { approvalStatus: "approved" }, include: { parent: { select: { name: true } } }, orderBy: [{ kind: "asc" }, { name: "asc" }] });
    const providerType = pro?.providerType === "profesional" || pro?.providerType === "oficio"
      ? pro.providerType
      : tipo === "profesional" || tipo === "oficio" ? tipo : undefined;
    const existingKyc = pro?.user?.kycCase;
    return <ProfessionalOnboardingForm categories={categories.map(({ id, name, icon, kind, parent }) => ({ id, name, icon, kind, parent }))} initial={{
      name: user.name, email: user.email, avatarUrl: user.avatarUrl, providerType, status: pro?.profileStatus, reason: existingKyc?.reviewReason,
      categoryIds: pro?.categoryLinks.map((link) => link.categoryId), headline: pro?.headline, bio: pro?.bio ?? "", paymentAlias: pro?.paymentAlias ?? "", paymentCvu: pro?.paymentCvu ?? "",
      legalName: existingKyc?.legalName, phone: existingKyc?.phone, birthDate: existingKyc?.birthDate.toISOString().slice(0, 10), cuil: existingKyc ? decryptKyc(existingKyc.cuilEncrypted) : undefined, dni: existingKyc ? decryptKyc(existingKyc.dniEncrypted) : undefined, address: existingKyc?.address,
    }} />;
  }
  if (pro.profileStatus !== "approved") return <section className="glass glass-solid rounded-2xl p-6"><h1 className="text-2xl font-bold text-slate-900">Perfil {pro.profileStatus === "rejected" ? "rechazado" : "en revisión"}</h1><p className="mt-2 text-slate-600">Podés seguir usando Busco. Para ofrecer, responder o recibir trabajos primero debe aprobarte administración.</p>{pro.user?.kycCase?.reviewReason && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{pro.user.kycCase.reviewReason}</p>}<Link href="/" className="glass-btn glass-btn-ghost mt-4 px-4 py-2.5 text-sm">Volver a Busco</Link></section>;

  const [bookings, requests, services, workSamples, conversations] = await Promise.all([
    pro
      ? prisma.booking.findMany({
          where: { professionalId: pro.id },
          orderBy: { createdAt: "desc" },
          include: { user: true, service: true, attachments: true, proposals: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } } },
        })
      : [],
    prisma.serviceRequest.findMany({
      // Las propias no: no tiene sentido ofrecerse a responderse a uno mismo.
      where: { status: "abierta", ...(user ? { NOT: { userId: user.id } } : {}), ...(pro ? { categoryId: { in: pro.categoryLinks.map((link) => link.categoryId) } } : {}) },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    pro
      ? prisma.service.findMany({
          where: { professionalId: pro.id },
          orderBy: { createdAt: "asc" },
        })
      : [],
    pro
      ? prisma.workSample.findMany({
          where: { professionalId: pro.id },
          orderBy: { createdAt: "desc" },
          include: { images: { orderBy: { position: "asc" } } },
        })
      : [],
    pro
      ? prisma.conversation.findMany({ where: { professionalId: pro.id }, select: { id: true, userId: true } })
      : [],
  ]);
  const conversationByUser = new Map(conversations.map((conversation) => [conversation.userId, conversation.id]));

  const pendientes = bookings.filter((b) => b.status === "requested").length;

  return (
    <div className="space-y-8">
      {!user && (
        <InvitadoAviso
          accion={
            user
              ? "recibir pedidos necesitás un perfil profesional"
              : "responder solicitudes y recibir pedidos"
          }
          next="/pro"
        />
      )}

      {/* Encabezado */}
      {pro ? (
        <EncabezadoPerfil
          name={pro.name}
          headline={pro.headline}
          zone={pro.zone}
          avatarColor="#047857"
          avatarUrl={pro.avatarUrl}
          coverUrl={pro.coverUrl}
          pendientes={pendientes}
        />
      ) : (
        <section className="glass glass-solid rounded-2xl p-6">
          <h1 className="text-xl font-bold text-slate-900">Panel del profesional</h1>
          <p className="mt-1 text-slate-500">
            Así se ve tu tablero cuando ofrecés servicios en ServiRed: los pedidos
            que te llegan, las solicitudes abiertas de clientes y tu lista de
            servicios.
          </p>
        </section>
      )}

      {/* Propuestas recibidas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Solicitudes recibidas</h2>
          <span className="text-sm text-slate-500">Revisá, rechazá o cotizá</span>
        </div>
        {bookings.length === 0 ? (
          <p className="glass rounded-2xl border-dashed border-white/70 p-6 text-sm text-slate-500">
            {pro
              ? "Cuando alguien te envíe una solicitud, aparece acá con sus imágenes."
              : "Acá aparecen los pedidos que te mandan los clientes, con las fotos que adjuntan."}
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              const conversationId = conversationByUser.get(b.userId);
              return <li key={b.id}>
                <details className="glass glass-card group overflow-hidden rounded-2xl">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden">
                    <Avatar name={b.user.name} color={b.user.avatarColor} src={b.user.avatarUrl} size={46} />
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{b.service?.title ?? "Servicio a convenir"}</p><p className="truncate text-sm text-slate-500">Creada por {b.user.name}</p></div>
                    {(b.finalPrice ?? b.quotedPrice) != null && <span className="hidden font-bold text-slate-800 sm:block">{formatARS(b.finalPrice ?? b.quotedPrice ?? 0)}</span>}
                    <StatusPill status={b.status} />
                    <ChevronLeftIcon width={18} height={18} className="rotate-[-90deg] text-slate-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="space-y-4 border-t border-white/60 p-4">
                    <div className="rounded-2xl bg-white/50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Usuario que creó la solicitud</p><div className="mt-2 flex items-center gap-2"><Avatar name={b.user.name} color={b.user.avatarColor} src={b.user.avatarUrl} size={38} /><div><p className="text-sm font-semibold text-slate-800">{b.user.name}</p><p className="text-xs text-slate-500">Cliente de ServiRed</p></div></div></div>
                    <div><p className="text-xs font-semibold text-slate-500">Detalle del pedido</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{b.note || "Sin descripción adicional."}</p></div>
                    <p className="text-xs text-slate-400">Recibida el {new Date(b.createdAt).toLocaleString("es-AR")}</p>
                    {b.workSummary && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-pro-dark">{b.workSummary}</p>}
                    {b.payments.map((payment) => <p key={payment.id} className={`rounded-xl px-3 py-2 text-sm font-semibold ${payment.status === "pagado" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>Pago por alias: {formatARS(payment.amount)} · {payment.status}</p>)}
                    {b.attachments.length > 0 && <div className="flex flex-wrap gap-2">{b.attachments.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer"><img src={attachment.url} alt={attachment.name} className="size-20 rounded-xl object-cover ring-1 ring-slate-200" /></a>)}</div>}
                    <div className="flex flex-wrap items-center justify-between gap-3">{conversationId ? <Link href={`/pro/mensajes?conversacion=${conversationId}`} className="inline-flex items-center gap-2 rounded-xl bg-pro px-4 py-2 text-sm font-semibold text-white"><ChatIcon width={17} height={17} />Chatear</Link> : <span />}<BookingActions bookingId={b.id} status={b.status} viewer="profesional" proposal={b.proposals[0] ?? null} finalPrice={b.finalPrice} paidPaymentId={b.payments.find((payment) => payment.status === "pagado")?.id} /></div>
                  </div>
                </details>
              </li>;
            })}
          </ul>
        )}
      </section>

      {/* Solicitudes abiertas de clientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Solicitudes de clientes</h2>
          <span className="text-sm text-slate-500">{requests.length} abiertas</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {requests.map((r) => <SolicitudCard key={r.id} request={{ ...r, createdAt: r.createdAt.toISOString(), category: r.category ? { name: r.category.name, icon: r.category.icon } : null }} />)}
        </div>
      </section>

      {/* Mis servicios */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Mis servicios</h2>
        {services.length === 0 ? (
          <p className="glass rounded-2xl border-dashed border-white/70 p-6 text-sm text-slate-500">
            {pro
              ? "Todavía no publicaste servicios."
              : "Acá va la lista de lo que ofrecés, con su precio desde y si está activo o en pausa."}
          </p>
        ) : (
        <ul className="glass glass-solid divide-y divide-white/60 rounded-2xl">
          {services.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{s.title}</p>
                <p className="truncate text-sm text-slate-500">{s.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold text-slate-900">{formatARS(s.priceFrom)}</span>
                <StatusPill status={s.status} />
              </div>
            </li>
          ))}
        </ul>
        )}
        {pro && (
          <p className="text-xs text-slate-400">
            Tu perfil público:{" "}
            <Link href={`/profesionales/${pro.id}`} className="font-medium text-pro hover:underline">
              ver cómo te ven los clientes
            </Link>
          </p>
        )}
      </section>

      {/* Trabajos particulares: los que hizo por fuera de la plataforma. No
          tienen calificación porque no hubo contratación que calificar. */}
      {pro ? (
        <TrabajosParticulares fotos={workSamples} />
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Muestra del profesional</h2>
          <p className="glass rounded-2xl border-dashed border-white/70 p-6 text-sm text-slate-500">
            Acá publicás muestras con hasta cinco fotos y una descripción.
          </p>
        </section>
      )}
    </div>
  );
}
