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
  const [ads, categories, sessions, searches, sourceGroups, countryGroups, preregistrations] = await Promise.all([
    prisma.ad.findMany(),
    prisma.category.findMany({ include: { parent: true, _count: { select: { professionals: true, requests: true, children: true } } }, orderBy: [{ parentId: "asc" }, { name: "asc" }] }),
    prisma.analyticsSession.findMany({ select: { visitorKey: true, durationSeconds: true } }),
    prisma.searchMetric.findMany({ include: { category: true } }),
    prisma.analyticsSession.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } }, take: 8 }),
    prisma.analyticsSession.groupBy({ by: ["country"], _count: true, orderBy: { _count: { country: "desc" } }, take: 8 }),
    prisma.preregistration.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const adMap = new Map(ads.map((ad) => [ad.slot, ad]));
  const rootCategories = categories.filter((category) => !category.parentId);
  const childrenByParent = new Map(rootCategories.map((category) => [category.id, categories.filter((child) => child.parentId === category.id)]));
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
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold">Preinscripciones</h2><p className="mt-1 text-sm text-slate-500">Personas anotadas para recibir novedades del lanzamiento.</p></div>
            <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{preregistrations.length} registros</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3">Interés</th><th className="px-4 py-3">Oficio</th></tr></thead>
              <tbody className="divide-y">{preregistrations.map((item) => <tr key={item.id}><td className="whitespace-nowrap px-4 py-3 text-slate-500">{item.createdAt.toLocaleString("es-AR")}</td><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{item.email}</td><td className="px-4 py-3">{item.phone}</td><td className="px-4 py-3 capitalize">{item.type}</td><td className="px-4 py-3">{item.occupation || "—"}</td></tr>)}{!preregistrations.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Todavía no hay preinscripciones.</td></tr>}</tbody>
            </table>
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

        <section id="categorias" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm font-semibold uppercase tracking-[.12em] text-blue-600">Catálogo</p><h2 className="text-xl font-bold">Categorías y subcategorías</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Usalas para ordenar profesionales, búsquedas y avisos. Cada subcategoría pertenece a un solo rubro.</p></div>
            <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800"><b>{rootCategories.length}</b> rubros · <b>{categories.length - rootCategories.length}</b> subcategorías</div>
          </div>
          <form action={createCategoryAction} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">+</span><div><h3 className="font-semibold">Agregar al catálogo</h3><p className="text-xs text-slate-500">Elegí “Rubro principal” para crear una categoría nueva.</p></div></div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_minmax(0,1fr)_auto]">
              <input name="name" required placeholder="Nombre (ej. Climatización)" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><input name="slug" placeholder="URL opcional" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><input name="icon" placeholder="Ícono" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><select name="parentId" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Rubro principal</option>{rootCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Agregar</button>
            </div>
          </form>
          <div className="space-y-3">{rootCategories.map((category) => {
            const children = childrenByParent.get(category.id) || [];
            return <div key={category.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <CategoryEditor category={category} roots={rootCategories} />
              <div className="border-t bg-slate-50/70 px-3 py-2 sm:px-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subcategorías ({children.length})</p><span className="text-xs text-slate-400">Se usan para afinar búsquedas y avisos</span></div>{children.length ? <div className="space-y-2">{children.map((child) => <CategoryEditor key={child.id} category={child} roots={rootCategories} child />)}</div> : <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-slate-400">Todavía no tiene subcategorías. Agregá una desde el formulario superior.</p>}</div>
            </div>;
          })}</div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>; }
function Ranking({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) { return <div className="rounded-2xl border bg-white p-4"><h3 className="font-semibold">{title}</h3>{rows.length ? <ol className="mt-3 space-y-2">{rows.map(([name, count]) => <li key={name} className="flex justify-between gap-2 text-sm"><span className="truncate">{name}</span><b>{count}</b></li>)}</ol> : <p className="mt-3 text-sm text-slate-400">{empty}</p>}</div>; }

function CategoryEditor({ category, roots, child = false }: { category: { id: string; name: string; slug: string; icon: string; parentId: string | null; parent: { name: string } | null; _count: { professionals: number; requests: number; children: number } }; roots: typeof category[]; child?: boolean }) {
  const used = category._count.professionals + category._count.requests + category._count.children;
  return <form action={updateCategoryAction} className="grid gap-2 p-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:p-4">
    <input type="hidden" name="id" value={category.id} /><input name="icon" aria-label="Ícono" defaultValue={category.icon} className="w-14 rounded-lg border px-2 py-2 text-center" /><input name="name" aria-label="Nombre" required defaultValue={category.name} className="rounded-lg border px-3 py-2 text-sm" /><input name="slug" aria-label="Slug" required defaultValue={category.slug} className="rounded-lg border px-3 py-2 text-sm" />
    <select name="parentId" aria-label="Categoría padre" defaultValue={category.parentId || ""} className="rounded-lg border px-3 py-2 text-sm"><option value="">Rubro principal</option>{roots.filter((root) => root.id !== category.id).map((root) => <option key={root.id} value={root.id}>{root.icon} {root.name}</option>)}</select>
    <div className="flex gap-2"><button className="rounded-lg border px-3 py-2 text-sm font-semibold">Guardar</button><button formAction={deleteCategoryAction} disabled={used > 0} title={used > 0 ? "No se puede eliminar porque está en uso" : undefined} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-30">Eliminar</button></div>
    <p className="text-xs text-slate-400 sm:col-start-2 sm:col-span-5">{child ? `Subcategoría de ${category.parent?.name ?? "rubro"}` : "Rubro principal"} · {category._count.professionals} profesionales · {category._count.requests} avisos{category._count.children ? ` · ${category._count.children} subcategorías` : ""}</p>
  </form>;
}
