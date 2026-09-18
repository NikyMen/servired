import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { buscarProfesionales } from "@/lib/cercanos";
import { formatoDistancia } from "@/lib/geo";
import { resolverUbicacion } from "@/lib/ubicacion";
import { AvisoUbicacion } from "@/components/AvisoUbicacion";
import { MapaCompleto } from "@/components/mapa/MapaCompleto";
import { SearchIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mapa" };

/** La sección Mapa. Es de quien tiene cuenta: el invitado va a entrar y vuelve acá. */
export default async function MapaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/mapa");
  const { q = "" } = await searchParams;
  const ubicacion = await resolverUbicacion(user);
  const pros = await buscarProfesionales({ q }, ubicacion.punto);

  return (
    // Ocupa el alto disponible entre el header y la barra inferior del celu.
    <div className="flex h-[calc(100dvh-15.5rem)] min-h-[440px] flex-col gap-3 md:h-[calc(100dvh-11rem)]">
      <form action="/mapa" role="search" className="glass glass-solid flex items-center gap-2 rounded-2xl px-3 py-2">
        <SearchIcon width={18} height={18} className="shrink-0 text-slate-400" />
        <input name="q" defaultValue={q} placeholder="Buscar oficio o nombre: plomero, electricista…" aria-label="Buscar en el mapa" className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none" />
        <button className="rounded-xl bg-cliente px-3 py-1.5 text-sm font-semibold text-white hover:bg-cliente-dark">Buscar</button>
      </form>
      <AvisoUbicacion origen={ubicacion.origen} localidad={ubicacion.localidad} />
      <div className="min-h-0 flex-1">
        <MapaCompleto
          centro={ubicacion.punto}
          items={pros.map((p) => ({
            id: p.id,
            nombre: p.businessName || p.name,
            oficio: p.headline,
            avatarUrl: p.avatarUrl,
            avatarColor: p.avatarColor,
            localidad: p.localidadNombre ?? p.zone,
            distancia: formatoDistancia(p.distanciaKm ?? 0),
            verified: p.verified,
            matriculado: p.matriculado,
            lat: p.punto.lat,
            lng: p.punto.lng,
          }))}
        />
      </div>
    </div>
  );
}
