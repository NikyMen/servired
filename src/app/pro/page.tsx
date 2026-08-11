import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { EncabezadoPerfil } from "@/components/pro/EncabezadoPerfil";
import { TrabajosParticulares } from "@/components/pro/TrabajosParticulares";
import { BookingActions } from "@/components/BookingActions";
import { SolicitudCard } from "@/components/pro/SolicitudCard";
import { InvitadoAviso } from "@/components/InvitadoAviso";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel del profesional" };

export default async function ProPanelPage() {
  // El panel se puede mirar sin cuenta: se ve la estructura y el tablero de
  // solicitudes abiertas, que es lo que hace que valga la pena darse de alta.
  // Lo que NO se ve sin ser el dueño es su bandeja: pedidos recibidos y
  // servicios salen vacíos, porque son de alguien.
  const user = await getSessionUser();
  const pro = user?.professionalId
    ? await prisma.professional.findUnique({ where: { id: user.professionalId } })
    : null;

  const [bookings, requests, services, workPhotos] = await Promise.all([
    pro
      ? prisma.booking.findMany({
          where: { professionalId: pro.id },
          orderBy: { createdAt: "desc" },
          include: { service: true, attachments: true, payments: { orderBy: { createdAt: "desc" } } },
        })
      : [],
    prisma.serviceRequest.findMany({
      // Las propias no: no tiene sentido ofrecerse a responderse a uno mismo.
      where: { status: "abierta", ...(user ? { NOT: { userId: user.id } } : {}) },
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
      ? prisma.workPhoto.findMany({
          where: { professionalId: pro.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, url: true, title: true, description: true, address: true, latitude: true, longitude: true },
        })
      : [],
  ]);

  const pendientes = bookings.filter((b) => b.status === "solicitada").length;

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
          <h2 className="text-lg font-bold text-slate-900">Peticiones recibidas</h2>
          <span className="text-sm text-slate-500">Revisá, rechazá o cotizá</span>
        </div>
        {bookings.length === 0 ? (
          <p className="glass rounded-2xl border-dashed border-white/70 p-6 text-sm text-slate-500">
            {pro
              ? "Cuando alguien te envíe una propuesta, aparece acá con sus imágenes."
              : "Acá aparecen los pedidos que te mandan los clientes, con las fotos que adjuntan."}
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="glass glass-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {b.service?.title ?? "Servicio a convenir"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {b.clientName}
                    {b.note && <> · “{b.note}”</>}
                  </p>
                  {(b.finalPrice ?? b.quotedPrice) != null && (
                    <p className="text-sm font-semibold text-pro-dark">
                      {b.finalPrice != null ? "Monto final" : "Presupuesto enviado"}: {formatARS(b.finalPrice ?? b.quotedPrice ?? 0)}
                    </p>
                  )}
                  {b.workSummary && <p className="text-xs text-slate-500">{b.workSummary}</p>}
                  {b.payments.map((payment) => (
                    <p key={payment.id} className={`mt-1 text-sm font-semibold ${payment.status === "pagado" ? "text-emerald-700" : "text-amber-700"}`}>
                      Mercado Pago demo: {formatARS(payment.amount)} · {payment.status}{payment.status === "pagado" ? ` · recibís ${formatARS(payment.netAmount)}` : ""}
                    </p>
                  ))}
                  {b.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {b.attachments.map((attachment) => (
                        <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer">
                          <img src={attachment.url} alt={attachment.name} className="size-16 rounded-xl object-cover ring-1 ring-slate-200" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={b.status} />
                  <BookingActions bookingId={b.id} status={b.status} viewer="profesional" />
                </div>
              </li>
            ))}
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
        <TrabajosParticulares fotos={workPhotos} />
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Trabajos particulares</h2>
          <p className="glass rounded-2xl border-dashed border-white/70 p-6 text-sm text-slate-500">
            Acá subís fotos de trabajos que hiciste por fuera de ServiRed. Aparecen
            en tu perfil como muestra, sin calificación, hasta que empieces a
            cerrar trabajos por la plataforma.
          </p>
        </section>
      )}
    </div>
  );
}
