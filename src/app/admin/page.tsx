import { logoutAdminAction } from "@/app/admin/actions";
import { AdminPreinscriptions } from "@/components/AdminPreinscriptions";
import { requireAdmin } from "@/lib/admin";
import { listPreinscriptions } from "@/lib/preinscripciones";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const rows = await listPreinscriptions();
  const serialized = rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));

  return <main className="min-h-screen px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><p className="text-sm font-semibold uppercase tracking-[0.15em] text-cliente">ServiRed</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Preinscripciones</h1><p className="mt-1 text-sm text-slate-500">{rows.length} contactos únicos · datos recuperados de todas las fuentes</p></div>
      <form action={logoutAdminAction}><button className="glass-btn glass-btn-ghost px-4 py-2.5 text-sm">Cerrar sesión</button></form>
    </div>
    <AdminPreinscriptions initialRows={serialized} />
  </div></main>;
}
