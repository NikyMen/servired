import { logoutAdminAction, saveAdAction, createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const slots = [
  ["left-1", "Lateral izquierda 1"], ["left-2", "Lateral izquierda 2"],
  ["right-1", "Lateral derecha 1"], ["right-2", "Lateral derecha 2"],
  ["mobile-1", "Móvil 1"], ["mobile-2", "Móvil 2"], ["mobile-3", "Móvil 3"], ["mobile-4", "Móvil 4"],
] as const;

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default async function AdminPage() {
  await requireAdmin();
  const [ads, categories, sessions, searches, sourceGroups, countryGroups] = await Promise.all([
    prisma.ad.findMany(),
    prisma.category.findMany({ include: { parent: true, _count: { select: { professionals: true, requests: true, children: true } } }, orderBy: [{ parentId: "asc" }, { name: "asc" }] }),
    prisma.analyticsSession.findMany({ select: { visitorKey: true, durationSeconds: true } }),
    prisma.searchMetric.findMany({ include: { category: true } }),
    prisma.analyticsSession.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } }, take: 8 }),
    prisma.analyticsSession.groupBy({ by: ["country"], _count: true, orderBy: { _count: { country: "desc" } }, take: 8 }),
  ]);
  const adMap = new Map(ads.map((ad) => [ad.slot, ad]));
  const termCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const item of searches) {
    if (item.term) termCounts.set(item.term, (termCounts.get(item.term) || 0) + 1);
    if (item.category) categoryCounts.set(item.category.name, (categoryCounts.get(item.category.name) || 0) + 1);
  }
  const top = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const avg = sessions.length ? Math.round(sessions.reduce((sum, row) => sum + row.durationSeconds, 0) / sessions.length) : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[.15em] text-cliente">ServiRed</p><h1 className="text-3xl font-bold">Panel administrador</h1></div>
          <form action={logoutAdminAction}><button className="rounded-xl border bg-white px-4 py-2 text-sm">Cerrar sesión</button></form>
        </header>

        <section>
          <h2 className="mb-3 text-xl font-bold">Métricas</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Personas" value={new Set(sessions.map((s) => s.visitorKey)).size} />
            <Metric label="Sesiones" value={sessions.length} />
            <Metric label="Tiempo promedio" value={duration(avg)} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Ranking title="Más buscados" rows={top(termCounts)} empty="Todavía no hay búsquedas." />
            <Ranking title="Categorías más usadas" rows={top(categoryCounts)} empty="Todavía no hay usos." />
            <Ranking title="Origen" rows={sourceGroups.map((x) => [x.source, x._count] as [string, number])} empty="Todavía no hay visitas." />
            <Ranking title="País" rows={countryGroups.map((x) => [x.country || "Sin dato", x._count] as [string, number])} empty="Disponible al desplegar con geolocalización del proveedor." />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Placas publicitarias</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map(([slot, label]) => { const ad = adMap.get(slot); return (
              <form key={slot} action={saveAdAction} className="rounded-2xl border bg-white p-4 shadow-sm">
                <input type="hidden" name="slot" value={slot} />
                <h3 className="mb-3 font-semibold">{label}</h3>
                <div className="grid gap-2"><input name="title" required defaultValue={ad?.title || "Publicidad"} placeholder="Título" className="rounded-lg border px-3 py-2" /><input name="imageUrl" defaultValue={ad?.imageUrl || ""} placeholder="URL de imagen" className="rounded-lg border px-3 py-2" /><input name="linkUrl" defaultValue={ad?.linkUrl || ""} placeholder="URL de destino" className="rounded-lg border px-3 py-2" /></div>
                <div className="mt-3 flex items-center justify-between"><label className="flex gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={ad?.enabled ?? true} /> Activa</label><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Guardar</button></div>
              </form>
            ); })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Categorías y subcategorías</h2>
          <form action={createCategoryAction} className="mb-4 grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_90px_1fr_auto]">
            <input name="name" required placeholder="Nombre" className="rounded-lg border px-3 py-2" /><input name="slug" required placeholder="slug" className="rounded-lg border px-3 py-2" /><input name="icon" placeholder="Ícono" className="rounded-lg border px-3 py-2" />
            <select name="parentId" className="rounded-lg border px-3 py-2"><option value="">Categoría principal</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Agregar</button>
          </form>
          <div className="space-y-2">{categories.map((category) => (
            <form key={category.id} action={updateCategoryAction} className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-[70px_1fr_1fr_auto_auto]">
              <input type="hidden" name="id" value={category.id} /><input name="icon" defaultValue={category.icon} className="rounded-lg border px-2 py-2" /><input name="name" required defaultValue={category.name} className="rounded-lg border px-3 py-2" />
              <select name="parentId" defaultValue={category.parentId || ""} className="rounded-lg border px-3 py-2"><option value="">Principal</option>{categories.filter((c) => c.id !== category.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="rounded-lg border px-3 py-2 text-sm font-semibold">Guardar</button>
              <button formAction={deleteCategoryAction} disabled={category._count.professionals + category._count.requests + category._count.children > 0} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-30">Eliminar</button>
              <p className="text-xs text-slate-400 md:col-start-2 md:col-span-4">{category.parent ? `Subcategoría de ${category.parent.name}` : "Categoría principal"} · {category._count.professionals} profesionales · {category._count.requests} solicitudes</p>
            </form>
          ))}</div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>; }
function Ranking({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) { return <div className="rounded-2xl border bg-white p-4"><h3 className="font-semibold">{title}</h3>{rows.length ? <ol className="mt-3 space-y-2">{rows.map(([name, count]) => <li key={name} className="flex justify-between gap-2 text-sm"><span className="truncate">{name}</span><b>{count}</b></li>)}</ol> : <p className="mt-3 text-sm text-slate-400">{empty}</p>}</div>; }
