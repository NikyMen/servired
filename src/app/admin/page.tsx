import Link from "next/link";
import type { Metadata } from "next";
import { createCategoryAction, deleteCategoryAction, ocultarUsuarioAction, saveSiteTextAction, unbanUserAction, updateCategoryAction } from "@/app/admin/actions";
import { AdminShell, type AdminSeccion } from "@/components/AdminShell";
import { AdminPreinscriptions } from "@/components/AdminPreinscriptions";
import { AdminPublicidad } from "@/components/AdminPublicidad";
import { AdminKyc } from "@/components/AdminKyc";
import { AdminReports } from "@/components/AdminReports";
import { AdminSoporte } from "@/components/AdminSoporte";
import { AdminLocalidades } from "@/components/AdminLocalidades";
import { AdminMatriculas } from "@/components/AdminMatriculas";
import { requireAdmin } from "@/lib/admin";
import { listPreinscriptions } from "@/lib/preinscripciones";
import { prisma } from "@/lib/prisma";
import { decryptKyc } from "@/lib/kyc";
import { formatARS, formatDate, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { necesitaReencuadre } from "@/lib/publicidad";
import { TERMS_DEFAULT, TERMS_SLUG, getSiteText } from "@/lib/site-text";
import { getSoporteConfig, soporteDelEnv } from "@/lib/soporte";
import { listarLocalidadesAdmin } from "@/lib/localidades";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración" };

const TABS = ["resumen", "kyc", "matriculas", "denuncias", "usuarios", "empleo", "trabajos", "catalogo", "publicidad", "soporte", "localidades", "legales", "preinscripciones"] as const;
type Tab = (typeof TABS)[number];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab: rawTab } = await searchParams;
  // "todo" era la pestaña vieja que mostraba todo junto: ahora cae al resumen.
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "resumen";

  const [preinscriptions, kycCases, users, bookings, categories, ads, terminos, reports, userCount, verifiedProviderCount, activeJobCount, soporte, localidades, credenciales, buscanEmpleo] = await Promise.all([
    listPreinscriptions(),
    prisma.kycCase.findMany({ orderBy: { updatedAt: "desc" }, include: { documents: true, user: { include: { oauthAccounts: true, professional: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { professional: { select: { providerType: true, profileStatus: true, verified: true } }, oauthAccounts: { select: { provider: true } }, _count: { select: { requests: true } } } }),
    prisma.booking.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { user: { select: { name: true } }, professional: { select: { name: true } }, proposals: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    prisma.category.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], include: { _count: { select: { professionals: true, requests: true } } } }),
    prisma.ad.findMany({ orderBy: { slot: "asc" } }),
    getSiteText(TERMS_SLUG, TERMS_DEFAULT),
    prisma.report.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { reporter: { select: { name: true, email: true } }, accused: { select: { id: true, name: true, email: true, accountStatus: true } } } }),
    prisma.user.count(),
    prisma.professional.count({ where: { verified: true, profileStatus: "approved" } }),
    prisma.booking.count({ where: { status: { in: ["in_progress", "finished", "payment_reported", "paid_awaiting_review"] } } }),
    getSoporteConfig(),
    listarLocalidadesAdmin(),
    prisma.credential.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { professional: { select: { name: true } }, category: { select: { name: true } } } }),
    // Quienes tildaron "ofertas en relación de dependencia": al registrarse o en su perfil pro.
    prisma.user.findMany({
      where: { ofertasDependencia: true },
      orderBy: { ofertasDependenciaAt: "desc" },
      select: {
        id: true, name: true, email: true, ofertasDependenciaAt: true, accountStatus: true,
        locality: { select: { name: true, province: true } },
        kycCase: { select: { phone: true } },
        professional: { select: { id: true, providerType: true, profileStatus: true, headline: true, phone: true, categoryLinks: { select: { category: { select: { name: true } } } } } },
      },
    }),
  ]);

  const soporteEnv = soporteDelEnv();
  const pendingKyc = kycCases.filter((kyc) => kyc.status === "pending").length;
  const pendingReports = reports.filter((report) => report.status === "pending").length;
  const pendingCredentials = credenciales.filter((c) => c.status === "pending").length;

  const serializedPreinscriptions = preinscriptions.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  const serializedReports = reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString(), resolvedAt: report.resolvedAt?.toISOString() ?? null }));
  // Vistas de los documentos privados, por dueño: el total y las últimas 10.
  const accesos = await prisma.documentAccessLog.findMany({
    where: { source: "kyc", ownerUserId: { in: kycCases.map((kyc) => kyc.userId) } },
    orderBy: { createdAt: "desc" },
    select: { ownerUserId: true, createdAt: true, viewer: true, ip: true, documentKind: true },
  });
  const accesosPorUsuario = new Map<string, { total: number; ultimos: { at: string; viewer: string; ip: string | null; kind: string }[] }>();
  for (const acceso of accesos) {
    const resumen = accesosPorUsuario.get(acceso.ownerUserId!) ?? { total: 0, ultimos: [] };
    resumen.total++;
    if (resumen.ultimos.length < 10) resumen.ultimos.push({ at: acceso.createdAt.toISOString(), viewer: acceso.viewer, ip: acceso.ip, kind: acceso.documentKind });
    accesosPorUsuario.set(acceso.ownerUserId!, resumen);
  }
  const serializedKyc = kycCases.map((kyc) => {
    const professional = kyc.user.professional;
    return { id: kyc.id, status: kyc.status, legalName: kyc.legalName, email: kyc.user.email, phone: kyc.phone, cuil: decryptKyc(kyc.cuilEncrypted), dni: decryptKyc(kyc.dniEncrypted), birthDate: kyc.birthDate.toISOString(), address: kyc.address, country: kyc.country, province: kyc.province, locality: kyc.locality, provider: kyc.user.oauthAccounts[0]?.provider || "email", providerType: professional?.providerType || "oficio", headline: professional?.headline || null, bio: professional?.bio || null, submittedAt: kyc.submittedAt?.toISOString() || null, reviewReason: kyc.reviewReason, reviewedBy: kyc.reviewedBy, reviewedAt: kyc.reviewedAt?.toISOString() || null, videoChallenge: kyc.videoChallenge, documents: kyc.documents.map((document) => ({ id: document.id, kind: document.kind })), accesos: accesosPorUsuario.get(kyc.userId) ?? { total: 0, ultimos: [] } };
  });
  const serializedAds = ads.map((ad) => ({ slot: ad.slot, title: ad.title, imageUrl: ad.imageUrl, whatsappPhone: ad.whatsappPhone, whatsappMessage: ad.whatsappMessage, tipo: ad.tipo === "profesional" ? "profesional" as const : "oficio" as const, enabled: ad.enabled, reencuadrar: necesitaReencuadre(ad) }));
  const categoryGroups = categories.filter((category) => !category.parentId);

  const secciones: AdminSeccion[] = [
    { tab: "resumen", nombre: "Resumen", titulo: "Resumen", descripcion: "Cómo viene la plataforma y qué está esperando una decisión.", icono: "◧", grupo: "Panel" },
    { tab: "kyc", nombre: "Identidad", titulo: "Verificación de identidad", descripcion: "Documentos y datos de quienes quieren ofrecer servicios.", icono: "🪪", grupo: "Revisión", pendientes: pendingKyc },
    { tab: "matriculas", nombre: "Matrículas", titulo: "Matrículas y certificados", descripcion: "Aprobada, el perfil muestra la insignia “Matriculado”. Rechazar pide motivo.", icono: "🎓", grupo: "Revisión", pendientes: pendingCredentials },
    { tab: "denuncias", nombre: "Denuncias", titulo: "Denuncias", descripcion: "Imágenes y conversaciones reportadas por la comunidad.", icono: "🚩", grupo: "Revisión", pendientes: pendingReports },
    { tab: "usuarios", nombre: "Usuarios", titulo: "Usuarios y oferentes", descripcion: "Las últimas 50 altas, con su estado de cuenta. Ocultar saca su perfil o sus solicitudes de todo el sitio, sin borrar nada.", icono: "👥", grupo: "Comunidad" },
    { tab: "empleo", nombre: "Aceptan dependencia", titulo: "Perfiles que aceptan ofertas en relación de dependencia", descripcion: `${buscanEmpleo.length} ${buscanEmpleo.length === 1 ? "perfil tildó" : "perfiles tildaron"} que, además de las oportunidades de su oficio, quieren recibir ofertas laborales en relación de dependencia.`, icono: "💼", grupo: "Comunidad" },
    { tab: "trabajos", nombre: "Trabajos", titulo: "Trabajos y propuestas", descripcion: "Actividad reciente del marketplace y estados comerciales.", icono: "🧰", grupo: "Comunidad" },
    { tab: "preinscripciones", nombre: "Preinscripciones", titulo: "Preinscripciones", descripcion: `${preinscriptions.length} contactos únicos captados antes del lanzamiento.`, icono: "📇", grupo: "Comunidad" },
    { tab: "publicidad", nombre: "Publicidad", titulo: "Publicidad del sitio", descripcion: "12 lugares y son todos: 3 al costado izquierdo, 3 al derecho y 6 debajo de la portada. Todas las placas son iguales; cambiar una de lugar es un botón.", icono: "🖼️", grupo: "Portada" },
    { tab: "catalogo", nombre: "Rubros", titulo: "Categorías y subcategorías", descripcion: "Organizá los rubros por tema sin cambiar sus perfiles ni solicitudes.", icono: "🏷️", grupo: "Portada" },
    { tab: "soporte", nombre: "Soporte", titulo: "Botón “Necesito ayuda”", descripcion: "El WhatsApp al que escribe quien pide ayuda desde cualquier pantalla.", icono: "💬", grupo: "Sitio" },
    { tab: "localidades", nombre: "Localidades", titulo: "Localidades", descripcion: "Las que se pueden elegir al darse de alta, y el punto de cada una en el mapa.", icono: "📍", grupo: "Sitio" },
    { tab: "legales", nombre: "Legales", titulo: "Términos y condiciones", descripcion: "El texto que acepta toda cuenta al entrar.", icono: "📜", grupo: "Sitio" },
  ];

  return (
    <AdminShell secciones={secciones} activa={tab}>
      {tab === "resumen" && (
        <Resumen
          usuarios={userCount}
          verificados={verifiedProviderCount}
          trabajos={activeJobCount}
          pendientes={[
            { tab: "kyc", nombre: "Identidades por verificar", cantidad: pendingKyc },
            { tab: "matriculas", nombre: "Matrículas por revisar", cantidad: pendingCredentials },
            { tab: "denuncias", nombre: "Denuncias sin resolver", cantidad: pendingReports },
          ]}
          placasActivas={serializedAds.filter((ad) => ad.imageUrl && ad.enabled).length}
          localidadesActivas={localidades.filter((l) => l.active).length}
          preinscriptos={preinscriptions.length}
        />
      )}

      {tab === "kyc" && <AdminKyc rows={serializedKyc} />}

      {tab === "matriculas" && <AdminMatriculas rows={credenciales.map((c) => ({ id: c.id, kind: c.kind, number: c.number, issuer: c.issuer, status: c.status, reviewReason: c.reviewReason, mimeType: c.mimeType, createdAt: c.createdAt.toISOString(), professional: c.professional, category: c.category }))} />}

      {tab === "denuncias" && <AdminReports rows={serializedReports} />}

      {tab === "usuarios" && (
        <div className="adm-card overflow-x-auto">
          <table className="adm-table min-w-[980px]">
            <thead>
              <tr><th>Usuario</th><th>Acceso</th><th>Email</th><th>Perfil oferente</th><th>Estado</th><th>Visibilidad</th><th>Alta</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold text-slate-900">{user.name}</td>
                  <td>{user.oauthAccounts[0]?.provider || "email"}</td>
                  <td><span className={user.emailVerifiedAt ? "text-emerald-700" : "text-amber-700"}>{user.email}</span></td>
                  <td>{user.professional ? `${user.professional.providerType} · ${user.professional.profileStatus}` : "Solo Busco"}</td>
                  <td>
                    {user.accountStatus === "suspended" ? (
                      <form action={unbanUserAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={user.id} />
                        <span className="adm-badge adm-badge-bad">Suspendida</span>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm">Reactivar</button>
                      </form>
                    ) : (
                      <span className={`adm-badge ${user.accountStatus === "approved" ? "adm-badge-ok" : "adm-badge-warn"}`}>
                        {user.accountStatus === "approved" ? "Activa" : "Email pendiente"}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1.5">
                      {user.professional && <OcultarBoton id={user.id} que="perfil" oculto={user.perfilOculto} />}
                      <OcultarBoton id={user.id} que="solicitudes" oculto={user.solicitudesOcultas} cantidad={user._count.requests} />
                    </div>
                  </td>
                  <td className="text-slate-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "empleo" && (
        buscanEmpleo.length === 0 ? (
          <div className="adm-card adm-card-pad text-sm text-slate-500">Todavía ningún perfil tildó «¿Además de las oportunidades vinculadas a tu oficio, te gustaría recibir ofertas laborales en relación de dependencia?». Aparece al registrarse como oficio o profesional, al completar el alta pro y en Mi perfil del pro.</div>
        ) : (
          <div className="adm-card overflow-x-auto">
            <table className="adm-table min-w-[860px]">
              <thead>
                <tr><th>Persona</th><th>Contacto</th><th>Oferente</th><th>Rubros</th><th>Localidad</th><th>Desde</th></tr>
              </thead>
              <tbody>
                {buscanEmpleo.map((persona) => {
                  const telefono = persona.kycCase?.phone || persona.professional?.phone || null;
                  const rubros = persona.professional?.categoryLinks.map((link) => link.category.name).join(", ");
                  return (
                    <tr key={persona.id}>
                      <td>
                        <p className="font-semibold text-slate-900">{persona.name}</p>
                        {persona.professional?.headline && <p className="text-xs text-slate-500">{persona.professional.headline}</p>}
                      </td>
                      <td>
                        <a href={`mailto:${persona.email}`} className="block text-indigo-700 hover:underline">{persona.email}</a>
                        {telefono ? <span className="text-xs text-slate-600">{telefono}</span> : <span className="text-xs text-slate-400">Sin teléfono todavía</span>}
                      </td>
                      <td>
                        {persona.professional ? (
                          <span className={`adm-badge ${persona.professional.profileStatus === "approved" ? "adm-badge-ok" : "adm-badge-warn"}`}>
                            {persona.professional.providerType === "profesional" ? "Profesional" : "Oficio"} · {persona.professional.profileStatus === "approved" ? "aprobado" : persona.professional.profileStatus === "pending" ? "en revisión" : persona.professional.profileStatus}
                          </span>
                        ) : (
                          <span className="adm-badge">Alta sin completar</span>
                        )}
                      </td>
                      <td className="max-w-[16rem] text-slate-600">{rubros || "—"}</td>
                      <td className="text-slate-600">{persona.locality ? `${persona.locality.name}, ${persona.locality.province}` : "—"}</td>
                      <td className="text-slate-500">{persona.ofertasDependenciaAt ? formatDate(persona.ofertasDependenciaAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "trabajos" && (
        <div className="adm-card overflow-x-auto">
          <table className="adm-table min-w-[760px]">
            <thead>
              <tr><th>Cliente</th><th>Oferente</th><th>Estado</th><th>Última propuesta</th><th>Actualizado</th></tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="font-semibold text-slate-900">{booking.user.name}</td>
                  <td>{booking.professional.name}</td>
                  <td><StatusPill status={booking.status} /></td>
                  <td>{booking.proposals[0] ? `${formatARS(booking.proposals[0].amount)} · ${proposalStatus(booking.proposals[0].status)}` : "—"}</td>
                  <td className="text-slate-500">{formatDateTime(booking.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "catalogo" && (
        <div className="space-y-4">
          <form action={createCategoryAction} className="adm-card adm-card-pad grid gap-3 lg:grid-cols-[70px_1fr_1fr_180px_150px_auto] lg:items-end">
            <div><label className="adm-label" htmlFor="rubro-icono">Ícono</label><input id="rubro-icono" name="icon" placeholder="🛠️" className="adm-field" /></div>
            <div><label className="adm-label" htmlFor="rubro-nombre">Nombre</label><input id="rubro-nombre" name="name" required placeholder="Nombre del rubro" className="adm-field" /></div>
            <div><label className="adm-label" htmlFor="rubro-slug">Slug</label><input id="rubro-slug" name="slug" placeholder="se arma solo" className="adm-field" /></div>
            <div><label className="adm-label" htmlFor="rubro-padre">Categoría principal</label><select id="rubro-padre" name="parentId" className="adm-field"><option value="">Crear categoría principal</option>{categoryGroups.map((group) => <option key={group.id} value={group.id}>{group.icon} {group.name}</option>)}</select></div>
            <div><label className="adm-label" htmlFor="rubro-tipo">Tipo de subcategoría</label><select id="rubro-tipo" name="kind" className="adm-field"><option value="oficio">Oficio</option><option value="profesional">Profesional</option></select></div>
            <button className="adm-btn">Agregar</button>
          </form>

          <p className="text-sm text-slate-500">Las categorías principales ordenan la portada. Los perfiles y las solicitudes se vinculan únicamente a subcategorías.</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {categoryGroups.map((group) => {
              const children = categories.filter((category) => category.parentId === group.id);
              const profiles = children.reduce((total, category) => total + category._count.professionals, 0);
              const requests = children.reduce((total, category) => total + category._count.requests, 0);
              return (
                <div key={group.id} className="adm-card">
                  <div className="border-b border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>{group.icon}</span>
                      <div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">{group.name}</h2><p className="text-xs text-slate-500">{children.length} subcategorías · {profiles} perfiles · {requests} solicitudes</p></div>
                      <details className="group relative">
                        <summary className="adm-btn adm-btn-ghost adm-btn-sm cursor-pointer list-none">Editar categoría</summary>
                        <form action={updateCategoryAction} className="absolute right-0 z-20 mt-2 grid w-[min(32rem,85vw)] gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:grid-cols-[65px_1fr_1fr_auto]">
                          <input type="hidden" name="id" value={group.id} />
                          <input name="icon" defaultValue={group.icon} aria-label="Ícono" className="adm-field" />
                          <input name="name" required defaultValue={group.name} aria-label="Nombre" className="adm-field" />
                          <input name="slug" defaultValue={group.slug} aria-label="Slug" className="adm-field" />
                          <button className="adm-btn adm-btn-sm">Guardar</button>
                        </form>
                      </details>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {children.map((category) => (
                      <details key={category.id} className="group px-4 py-2.5">
                        <summary className="flex cursor-pointer list-none items-center gap-3">
                          <span className="text-xl">{category.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">{category.name}<span className="adm-badge capitalize">{category.kind}</span></span>
                            <span className="block text-xs text-slate-500">{category._count.professionals} perfiles · {category._count.requests} solicitudes</span>
                          </span>
                          <span className="adm-btn adm-btn-ghost adm-btn-sm">Editar</span>
                        </summary>
                        <form action={updateCategoryAction} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 lg:grid-cols-[60px_1fr_1fr_160px_130px_auto] lg:items-center">
                          <input type="hidden" name="id" value={category.id} />
                          <input name="icon" defaultValue={category.icon} aria-label="Ícono" className="adm-field" />
                          <input name="name" required defaultValue={category.name} aria-label="Nombre" className="adm-field" />
                          <input name="slug" defaultValue={category.slug} aria-label="Slug" className="adm-field" />
                          <select name="parentId" defaultValue={category.parentId ?? ""} aria-label="Categoría principal" className="adm-field">{categoryGroups.map((option) => <option key={option.id} value={option.id}>{option.icon} {option.name}</option>)}</select>
                          <select name="kind" defaultValue={category.kind} aria-label="Tipo" className="adm-field"><option value="oficio">Oficio</option><option value="profesional">Profesional</option></select>
                          <button className="adm-btn adm-btn-sm">Guardar</button>
                        </form>
                        <form action={deleteCategoryAction} className="mt-2 text-right">
                          <input type="hidden" name="id" value={category.id} />
                          <button className="adm-btn adm-btn-danger adm-btn-sm">Eliminar si no está en uso</button>
                        </form>
                      </details>
                    ))}
                    {!children.length && <p className="px-4 py-6 text-center text-sm text-slate-500">Todavía no hay subcategorías.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "publicidad" && <AdminPublicidad ads={serializedAds} />}

      {tab === "soporte" && (
        <div className="space-y-3">
          <p className="adm-card adm-card-pad max-w-xl text-sm text-slate-600">
            {soporteEnv
              ? <>El número sale de <code className="rounded bg-slate-100 px-1">SOPORTE_WHATSAPP</code> en el <code className="rounded bg-slate-100 px-1">.env</code> del servidor y manda sobre este formulario: abre WhatsApp al <strong>+549 {soporteEnv.phone}</strong>. Para cambiarlo, editá el <code className="rounded bg-slate-100 px-1">.env</code> y reiniciá el sitio.</>
              : soporte.phone ? <>El botón abre WhatsApp al <strong>+549 {soporte.phone}</strong>.</> : "Sin número cargado: el botón no se muestra en el sitio."}
          </p>
          {!soporteEnv && <AdminSoporte initial={soporte} />}
        </div>
      )}

      {tab === "localidades" && (
        <div className="space-y-3">
          <p className="adm-card adm-card-pad text-sm text-slate-600">
            <strong className="text-slate-900">{localidades.filter((l) => l.active).length} activas</strong> de {localidades.length}. Se eligen al darse de alta; una desactivada deja de ofrecerse, pero quien la tiene la conserva.
          </p>
          <AdminLocalidades rows={localidades.map((l) => ({ id: l.id, name: l.name, province: l.province, latitude: l.latitude, longitude: l.longitude, active: l.active, users: l._count.users }))} />
        </div>
      )}

      {tab === "legales" && (
        <form action={saveSiteTextAction} className="adm-card adm-card-pad space-y-3">
          <input type="hidden" name="slug" value={TERMS_SLUG} />
          <p className="text-sm text-slate-600">
            Versión vigente: <strong className="text-slate-900">{terminos.version}</strong>. {terminos.updatedAt ? `Última modificación: ${formatDate(terminos.updatedAt)}` : "Todavía se muestra el texto inicial."}
          </p>
          <div><label className="adm-label" htmlFor="legal-titulo">Título de la página</label><input id="legal-titulo" name="title" required defaultValue={terminos.title} className="adm-field" /></div>
          <div><label className="adm-label" htmlFor="legal-texto">Texto</label><textarea id="legal-texto" name="body" required rows={22} defaultValue={terminos.body} className="adm-field resize-y font-mono text-xs leading-5" /></div>
          <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" name="nuevaVersion" className="mt-0.5 size-4 accent-amber-600" />
            <span><strong>Publicar como versión nueva.</strong> Todas las cuentas van a tener que volver a aceptar los términos al entrar. Dejalo sin tildar si solo corregís un error de tipeo.</span>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Empezá una línea con <code className="rounded bg-slate-100 px-1 font-mono">## </code> para un subtítulo y con <code className="rounded bg-slate-100 px-1 font-mono">- </code> para un ítem. Un renglón en blanco corta párrafo.</p>
            <div className="flex gap-2">
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-ghost">Ver la página</a>
              <button className="adm-btn">Guardar texto</button>
            </div>
          </div>
        </form>
      )}

      {tab === "preinscripciones" && <AdminPreinscriptions initialRows={serializedPreinscriptions} />}
    </AdminShell>
  );
}

/** Portada del panel: los números de la plataforma y los atajos a lo que espera. */
function Resumen({ usuarios, verificados, trabajos, pendientes, placasActivas, localidadesActivas, preinscriptos }: {
  usuarios: number; verificados: number; trabajos: number;
  pendientes: { tab: string; nombre: string; cantidad: number }[];
  placasActivas: number; localidadesActivas: number; preinscriptos: number;
}) {
  const total = pendientes.reduce((suma, p) => suma + p.cantidad, 0);
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Usuarios" value={usuarios} note="Cuentas registradas" />
        <Metric label="Oferentes verificados" value={verificados} note="Perfiles publicados" />
        <Metric label="Trabajos activos" value={trabajos} note="Máximo 3 por oferente" />
        <Metric label="Preinscriptos" value={preinscriptos} note="Contactos únicos" />
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2 className="font-bold text-slate-900">Esperando una decisión</h2>
          <span className={`adm-badge ${total ? "adm-badge-warn" : "adm-badge-ok"}`}>{total ? `${total} en total` : "Todo al día"}</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {pendientes.map((p) => (
            <li key={p.tab}>
              <Link href={`/admin?tab=${p.tab}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700">{p.nombre}</span>
                <span className="flex items-center gap-2">
                  <span className={`adm-badge ${p.cantidad ? "adm-badge-warn" : "adm-badge-ok"}`}>{p.cantidad || "0"}</span>
                  <span aria-hidden className="text-slate-400">›</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Metric label="Placas de publicidad" value={placasActivas} note="Con imagen y visibles" />
        <Metric label="Localidades activas" value={localidadesActivas} note="Se ofrecen al darse de alta" />
      </section>
    </div>
  );
}

/** Ocultar / mostrar el perfil o las solicitudes de un usuario, desde Usuarios. */
function OcultarBoton({ id, que, oculto, cantidad }: { id: string; que: "perfil" | "solicitudes"; oculto: boolean; cantidad?: number }) {
  const nombre = que === "perfil" ? "perfil" : `solicitudes${cantidad !== undefined ? ` (${cantidad})` : ""}`;
  return (
    <form action={ocultarUsuarioAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="que" value={que} />
      <input type="hidden" name="ocultar" value={oculto ? "no" : "si"} />
      {oculto && <span className="adm-badge adm-badge-bad">{que === "perfil" ? "Perfil oculto" : "Solicitudes ocultas"}</span>}
      <button className={`adm-btn adm-btn-sm ${oculto ? "adm-btn-ghost" : "adm-btn-danger"}`}>{oculto ? `Mostrar ${nombre}` : `Ocultar ${nombre}`}</button>
    </form>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="adm-card adm-card-pad">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <strong className="mt-0.5 block text-3xl font-bold text-slate-900">{value}</strong>
      <p className="text-xs text-slate-400">{note}</p>
    </article>
  );
}

function proposalStatus(status: string) {
  return ({ pending: "pendiente", accepted: "aceptada", rejected: "rechazada", expired: "vencida" } as Record<string, string>)[status] || status;
}
