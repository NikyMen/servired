import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { buscarProfesionales } from "@/lib/cercanos";
import { formatoDistancia } from "@/lib/geo";
import { resolverUbicacion } from "@/lib/ubicacion";
import { AvisoUbicacion } from "@/components/AvisoUbicacion";
import { MapaCompleto } from "@/components/mapa/MapaCompleto";
import { SearchIcon } from "@/components/icons";
import { MapaBloqueado } from "@/components/mapa/MapaBloqueado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mapa" };

/**
 * La sección Mapa. Es de quien tiene cuenta: el invitado ve el mapa
 * difuminado, sin ninguna ubicación real, y la invitación a entrar.
 */
export default async function MapaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getSessionUser();
  if (!user) return <MapaBloqueado className="h-[calc(100dvh-15.5rem)] min-h-[440px] md:h-[calc(100dvh-11rem)]" />;
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
          editarZona={user.professionalStatus === "approved"}
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
            zona: p.latitude != null && p.longitude != null,
            lat: p.punto.lat,
            lng: p.punto.lng,
          }))}
        />
      </div>
    </div>
  );
}
