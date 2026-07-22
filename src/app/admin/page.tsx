import { logoutAdminAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";
import { hasMongoStorage, listPreinscriptions } from "@/lib/preinscripciones";
import { AdminPreinscriptions } from "@/components/AdminPreinscriptions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const rows = await listPreinscriptions();
  const serialized = rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cliente">ServiRed</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Preinscripciones</h1>
            <p className="mt-1 text-sm text-slate-500">
              {rows.length} contacto{rows.length === 1 ? "" : "s"} · {hasMongoStorage() ? "MongoDB" : "SQLite local"}
            </p>
          </div>
          <form action={logoutAdminAction}>
            <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cerrar sesión
            </button>
          </form>
        </div>
        <AdminPreinscriptions initialRows={serialized} />
      </div>
    </main>
  );
}
