import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ClientResultSwitch } from "@/components/ClientResultSwitch";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { HeroFondo } from "@/components/HeroFondo";
import { MapView } from "@/components/MapView";
import { AdPlate } from "@/components/AdPlate";
import { CarruselPublicidad, type ItemCarrusel } from "@/components/CarruselPublicidad";
import { CategoriasMenu } from "@/components/CategoriasMenu";
import { Atenuable, EnlaceSuave, NavegacionSuave } from "@/components/NavegacionSuave";
import { PLACAS, SLOTS, nombreDeSlot } from "@/lib/publicidad";
import { getPublicitarHref } from "@/lib/soporte";
import { getSessionUser } from "@/lib/auth";
import { buscarProfesionales } from "@/lib/cercanos";
import { RADIO_KM, formatoDistancia, haversineKm } from "@/lib/geo";
import { resolverUbicacion } from "@/lib/ubicacion";
import { AvisoUbicacion } from "@/components/AvisoUbicacion";
import { MapaBloqueado } from "@/components/mapa/MapaBloqueado";

export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string; tipo?: "profesional" | "oficio" };


async function getData({ q, categoria, tipo }: Search) {
  const user = await getSessionUser();
  // Con sesión todo se limita a 10 km de su ubicación; el invitado ve todo,
  // pero sin ninguna coordenada (ni mapa ni punto de las solicitudes).
  const ubicacion = user ? await resolverUbicacion(user) : null;
  const centro = ubicacion?.punto ?? null;
  const cerca = (lat: number, lng: number) => !centro || haversineKm(centro, { lat, lng }) <= RADIO_KM;

  const [categories, pros, requests, workPhotos, ads] = await Promise.all([
    prisma.category.findMany({ where: { approvalStatus: "approved" }, include: { parent: true }, orderBy: [{ parentId: "asc" }, { createdAt: "asc" }] }),
    // Categoría y ubicación filtran; el texto libre se rankea en memoria
    // (ver src/lib/search.ts: LIKE de SQLite no ignora acentos ni tolera typos).
    buscarProfesionales({ q, categoria, tipo }, centro),
    prisma.serviceRequest.findMany({
      where: { status: "abierta", expiresAt: { gt: new Date() }, user: { accountStatus: "approved", solicitudesOcultas: false }, AND: [...(categoria ? [{ category: { OR: [{ slug: categoria }, { parent: { slug: categoria } }] } }] : []), ...(tipo ? [{ category: { kind: tipo } }] : [])] },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    user
      ? prisma.workPhoto.findMany({
          // Las fotos de trabajos son parte del perfil: con el perfil oculto, tampoco.
          where: { latitude: { not: null }, longitude: { not: null }, professional: { OR: [{ userId: null }, { user: { perfilOculto: false } }] } },
          orderBy: { createdAt: "desc" },
          include: { professional: { select: { id: true, name: true, businessName: true } } },
        })
      : Promise.resolve([]),
    prisma.ad.findMany(),
  ]);
  const contactedUserIds = user?.professionalId
    ? new Set((await prisma.conversation.findMany({ where: { professionalId: user.professionalId }, select: { userId: true } })).map((conversation) => conversation.userId))
    : new Set<string>();
  return {
    user,
    ubicacion,
    categories,
    pros,
    requests: requests.filter((r) => cerca(r.latitude, r.longitude)),
    workPhotos: workPhotos.filter((w) => cerca(w.latitude!, w.longitude!)),
    ads,
    contactedUserIds,
  };
}

function chipHref(params: Search, categoria: string) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tipo) sp.set("tipo", params.tipo);
  if (categoria) sp.set("categoria", categoria);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const [{ user, ubicacion, categories, pros, requests, workPhotos, ads, contactedUserIds }, publicitarHref] = await Promise.all([
    getData(params),
    getPublicitarHref(),
  ]);
  const adMap = new Map(ads.map((ad) => [ad.slot, ad]));
  // Celular: una fila por tipo, solo con las placas activas de ese tipo. Si un
  // tipo no tiene ninguna, su fila igual se ve, con lugares libres que invitan
  // a publicitar ("Tu publicidad acá"), así los dos carruseles están siempre.
  const filaDe = (tipo: "oficio" | "profesional"): ItemCarrusel[] => {
    const activas: ItemCarrusel[] = PLACAS.flatMap((placa) => {
      const ad = adMap.get(placa.slot);
      const activa = ad && ad.enabled && (ad.imageUrl || ad.title);
      if (!activa || (ad.tipo === "profesional" ? "profesional" : "oficio") !== tipo) return [];
      return [{ key: placa.slot, label: `Publicidad ${placa.nombre}`, ad: { slot: ad.slot, title: ad.title, imageUrl: ad.imageUrl, whatsappPhone: ad.whatsappPhone, whatsappMessage: ad.whatsappMessage, enabled: ad.enabled } }];
    });
    return activas.length ? activas : [{ key: `libre-${tipo}`, ad: null, label: `Publicidad de ${tipo === "oficio" ? "oficios" : "profesionales"}` }];
  };
  const rubrosVisibles = categories.filter((category) => category.parentId && (!params.tipo || category.kind === params.tipo));
  const parentIdsVisibles = new Set(rubrosVisibles.map((category) => category.parentId));
  const seleccionada = categories.find((category) => category.slug === params.categoria);
  const principalSeleccionada = seleccionada?.parentId ? categories.find((category) => category.id === seleccionada.parentId) : seleccionada;
  const principales = categories.filter((category) => !category.parentId && (parentIdsVisibles.has(category.id) || category.id === principalSeleccionada?.id));

  return (
    <NavegacionSuave>
    <div className="relative space-y-6">
      {/* Hero: banner con la foto de portada (public/servired-panel-entrada2.jpeg;
          si no está, <HeroFondo> cae en la escena dibujada en canvas) y los dos
          filtros Profesionales/Oficios apoyados encima. La búsqueda vive en el
          header, no acá. */}
      <div className="relative">
        {/* min-h más bajo que antes: en móvil el alto es lo que decide cuánto
            se agranda la foto, así que un banner menos alto deja entrar más
            escena a lo ancho en vez de un primer plano. En md+ manda la
            proporción de la foto (ver .hero-weld en globals.css). */}
        <section className="hero-weld relative z-10 min-h-[215px] rounded-[1.5rem] p-5 text-white sm:min-h-[470px] sm:p-8 md:min-h-[235px] md:p-10">
          <HeroFondo />

          <div className="hero-weld-filtros absolute inset-0 z-[3] grid grid-cols-2 overflow-hidden rounded-[1.5rem]" aria-label="Filtrar prestadores">
            <EnlaceSuave href="/?tipo=profesional" irA="resultados" className="flex items-start justify-center border-r border-white/25 px-2 pt-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 sm:justify-start sm:px-6 sm:pt-6" aria-label="Ver solo profesionales"><span className="hero-weld-filtro rounded-full bg-blue-600/90 px-4 py-2 text-sm font-bold shadow-lg backdrop-blur-sm">Profesionales</span></EnlaceSuave>
            <EnlaceSuave href="/?tipo=oficio" irA="resultados" className="flex items-start justify-center px-2 pt-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 sm:justify-end sm:px-6 sm:pt-6" aria-label="Ver solo oficios"><span className="hero-weld-filtro rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-bold shadow-lg backdrop-blur-sm">Oficios</span></EnlaceSuave>
          </div>

          {/* La frase va al medio del banner, en los dos ejes. El
              pointer-events-none no se toca: abajo, en z-[3], están las dos
              mitades clickeables del filtro, y el título las taparía. */}
          <div className="hero-weld-content pointer-events-none flex min-h-[175px] flex-col justify-center pb-1 sm:min-h-[406px] md:min-h-[155px]">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-xl leading-[1.15] font-bold tracking-tight drop-shadow-[0_2px_18px_rgba(2,6,23,0.8)] sm:text-3xl md:text-4xl">
                <span className="block">Tu problema tiene solución.</span>
                <span className="block">Encontrala acá.</span>
              </h1>
            </div>
          </div>
        </section>
      </div>

      {/* Las 12 placas, todas del mismo tamaño. En el celular van en dos
          carruseles por tipo. De md a xl no hay lugar para las franjas de los
          costados, así que acá se ven las 12 juntas, de 4 en 4 (3 filas). Desde xl, 6 se van a las franjas fijas de los costados
          (<AdsCostados>, en el layout) y acá queda una sola fila con las otras
          6, que en 1024 px de contenido da cuadrados de ~155 px: casi la misma
          medida que las de los costados. */}
      <section aria-label="Publicidad">
        {/* Celular: dos carruseles que no paran, primero oficios (hacia la
            derecha) y abajo profesionales (hacia la izquierda). Se pueden
            arrastrar y revolear; a los 2 s de soltarlos siguen solos. */}
        <div className="space-y-3 md:hidden">
          <CarruselPublicidad titulo="Oficios" tono="bg-emerald-600" sentido="derecha" items={filaDe("oficio")} invitarHref={publicitarHref} />
          <CarruselPublicidad titulo="Profesionales" tono="bg-blue-600" sentido="izquierda" items={filaDe("profesional")} invitarHref={publicitarHref} />
        </div>
        <div className="hidden grid-cols-4 gap-2 sm:gap-3 md:grid xl:hidden">
          {PLACAS.map((placa) => (
            <AdPlate key={placa.slot} ad={adMap.get(placa.slot) || null} label={`Publicidad ${placa.nombre}`} className="rounded-2xl" invitarHref={publicitarHref} />
          ))}
        </div>
        <div className="hidden gap-3 xl:grid xl:grid-cols-6">
          {SLOTS.debajo.map((slot) => (
            <AdPlate key={slot} ad={adMap.get(slot) || null} label={`Publicidad ${nombreDeSlot(slot)}`} className="rounded-2xl" invitarHref={publicitarHref} />
          ))}
        </div>
      </section>

      <section id="categorias" aria-label="Categorías de servicios" className="scroll-mt-28 space-y-3">
        <CategoriasMenu
          todos={{ key: "", href: chipHref(params, ""), label: "Todos", active: !params.categoria }}
          principales={principales.map((category) => ({
            key: category.slug,
            href: chipHref(params, category.slug),
            label: `${category.icon} ${category.name}`,
            name: category.name,
            active: principalSeleccionada?.id === category.id,
            subcategorias: rubrosVisibles
              .filter((sub) => sub.parentId === category.id)
              .map((sub) => ({ key: sub.slug, href: chipHref(params, sub.slug), label: `${sub.icon} ${sub.name}`, active: params.categoria === sub.slug })),
          }))}
        />
      </section>

      <div id="resultados" className="scroll-mt-28" />
      <Atenuable className="space-y-6">
      <ClientResultSwitch
        requests={requests.map((r) => ({
          ...r,
          latitude: user ? r.latitude : null,
          longitude: user ? r.longitude : null,
          createdAt: r.createdAt.toISOString(),
          category: r.category ? { name: r.category.name, icon: r.category.icon } : null,
          alreadyContacted: contactedUserIds.has(r.userId),
        }))}
      />

      {ubicacion && <AvisoUbicacion origen={ubicacion.origen} localidad={ubicacion.localidad} />}

      {/* Resultados */}
      {pros.length === 0 ? (
        <div className="glass glass-solid rounded-[1.5rem] p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">{ubicacion ? `No encontramos profesionales a ${RADIO_KM} km` : "Sin resultados"}</p>
          <p className="mt-1 text-slate-500">
            {ubicacion ? "Probá con otra búsqueda, o publicá una solicitud y te contactan." : "Probá con otra categoría o término de búsqueda."}
          </p>
          {ubicacion && <Link href="/publicar-solicitud" className="glass-btn mt-4 inline-flex px-4 py-2 text-sm">Publicar solicitud</Link>}
        </div>
      ) : (
        <div id="professional-results" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {pros.map((p) => (
            <ProfessionalCard
              key={p.id}
              pro={{
                id: p.id,
                name: p.name,
                headline: p.headline,
                category: { slug: p.category.slug, name: p.category.name, icon: p.category.icon },
                avatarColor: p.avatarColor,
                avatarUrl: p.avatarUrl,
                rating: p.rating,
                reviewsCount: p.reviewsCount,
                bio: p.bio,
                zone: p.zone,
                localidad: p.localidadNombre,
                distancia: p.distanciaKm != null ? formatoDistancia(p.distanciaKm) : null,
                completedJobs: p._count.bookings,
                externalJobs: p._count.workSamples,
                providerType: p.providerType === "profesional" ? "profesional" : "oficio",
                verified: p.verified,
                matriculado: p.matriculado,
                featured: p.featured,
                yearsExperience: p.yearsExperience,
              }}
            />
          ))}
        </div>
      )}
      </Atenuable>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mapa de oportunidades</h2>
            <p className="text-sm text-slate-500">{ubicacion ? `Profesionales, trabajos abiertos y trabajos realizados a ${RADIO_KM} km.` : "Profesionales y trabajos cerca tuyo."}</p>
          </div>
          {ubicacion && <Link href="/mapa" className="text-sm font-semibold text-cliente-dark hover:underline">Ver mapa completo →</Link>}
        </div>
        {ubicacion ? (
          <>
            <MapView
              centro={ubicacion.punto}
              radioKm={RADIO_KM}
              enVivo
              points={[
                ...pros.map((p) => ({
                  id: p.id, type: "profesional" as const, title: p.businessName || p.name,
                  subtitle: `${p.headline} · ${p.localidadNombre ?? p.zone}${p.distanciaKm != null ? ` · ${formatoDistancia(p.distanciaKm)}` : ""}`, latitude: p.punto.lat, longitude: p.punto.lng, href: `/profesionales/${p.id}`,
                })),
                ...requests.map((r) => ({
                  id: r.id, type: "solicitud" as const, title: r.title,
                  subtitle: `${r.category?.name ?? "Otro"} · ${r.zone}`, latitude: r.latitude, longitude: r.longitude, href: "/solicitudes",
                })),
                ...workPhotos.map((work) => ({
                  id: work.id, type: "trabajo" as const, title: work.title,
                  subtitle: `${work.professional.businessName || work.professional.name} · ${work.address || "Corrientes"}`, latitude: work.latitude!, longitude: work.longitude!, href: `/profesionales/${work.professional.id}`,
                })),
              ]}
            />
            <div className="flex flex-wrap gap-3 text-xs text-slate-500"><span>🟢 Profesionales</span><span>🔵 Trabajos abiertos</span><span>🟠 Trabajos realizados</span></div>
          </>
        ) : (
          <MapaBloqueado />
        )}
      </section>

      {/* CTA solicitud */}
      <section className="glass glass-solid glass-card flex flex-col items-start justify-between gap-3 rounded-[1.5rem] p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-slate-900">¿No encontrás lo que buscás?</h2>
          <p className="text-sm text-slate-500">
            Publicá tu solicitud y los profesionales te contactan.
          </p>
        </div>
        <Link href="/publicar-solicitud" className="glass-btn shrink-0 px-4 py-2.5 text-sm">
          Publicar solicitud
        </Link>
      </section>

    </div>
    </NavegacionSuave>
  );
}
