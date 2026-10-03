import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

/**
 * Pestaña "Conversaciones" del admin: todos los chats entre clientes y
 * oferentes, de solo lectura. A propósito no hay ningún formulario: desde acá
 * no se puede escribir, ni marcar como leído, ni tocar nada del hilo.
 */
export async function AdminConversaciones({ conversacionId, buscar }: { conversacionId?: string; buscar?: string }) {
  const q = buscar?.trim().slice(0, 80) ?? "";
  const [hilos, elegida] = await Promise.all([
    prisma.conversation.findMany({
      where: q ? { OR: [{ user: { name: { contains: q } } }, { user: { email: { contains: q } } }, { professional: { name: { contains: q } } }, { professional: { businessName: { contains: q } } }] } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true, updatedAt: true,
        user: { select: { name: true } },
        professional: { select: { name: true, businessName: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, sender: true, attachmentName: true } },
      },
    }),
    conversacionId
      ? prisma.conversation.findUnique({
          where: { id: conversacionId },
          include: {
            user: { select: { name: true, email: true } },
            professional: { select: { id: true, name: true, businessName: true, user: { select: { email: true } } } },
            messages: { orderBy: { createdAt: "asc" } },
          },
        })
      : null,
  ]);

  const enlace = (id?: string) => {
    const sp = new URLSearchParams({ tab: "conversaciones" });
    if (q) sp.set("q", q);
    if (id) sp.set("c", id);
    return `/admin?${sp.toString()}`;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {/* En el celular, con un hilo abierto, la lista se esconde: hay un "Volver". */}
      <section className={`adm-card flex max-h-[75vh] flex-col ${elegida ? "hidden lg:flex" : ""}`}>
        <form action="/admin" className="border-b border-slate-100 p-3">
          <input type="hidden" name="tab" value="conversaciones" />
          <input name="q" defaultValue={q} placeholder="Buscar por cliente, oferente o email" aria-label="Buscar conversaciones" className="adm-field" />
        </form>
        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {hilos.map((hilo) => {
            const ultimo = hilo.messages[0];
            const pro = hilo.professional.businessName || hilo.professional.name;
            return (
              <li key={hilo.id}>
                <Link href={enlace(hilo.id)} aria-current={hilo.id === elegida?.id ? "page" : undefined} className={`block px-4 py-3 hover:bg-slate-50 ${hilo.id === elegida?.id ? "bg-indigo-50" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{hilo.user.name} <span className="font-normal text-slate-400">↔</span> {pro}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{formatDateTime(hilo.updatedAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {ultimo ? `${ultimo.sender === "profesional" ? "Oferente" : "Cliente"}: ${ultimo.text || (ultimo.attachmentName ? `📎 ${ultimo.attachmentName}` : "")}` : "Sin mensajes todavía"}
                    <span className="text-slate-400"> · {hilo._count.messages} {hilo._count.messages === 1 ? "mensaje" : "mensajes"}</span>
                  </p>
                </Link>
              </li>
            );
          })}
          {!hilos.length && <li className="px-4 py-6 text-center text-sm text-slate-500">{q ? "Ninguna conversación coincide con esa búsqueda." : "Todavía no hay conversaciones."}</li>}
        </ul>
        {hilos.length === 100 && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Se muestran las 100 más recientes. Buscá para encontrar otras.</p>}
      </section>

      <section className={`adm-card flex max-h-[75vh] flex-col ${elegida ? "" : "hidden lg:flex"}`}>
        {elegida ? (
          <>
            <div className="adm-card-head flex-wrap gap-2">
              <div className="min-w-0">
                <Link href={enlace()} className="mb-1 inline-block text-xs font-semibold text-indigo-700 hover:underline lg:hidden">← Volver a la lista</Link>
                <h2 className="truncate font-bold text-slate-900">{elegida.user.name} ↔ {elegida.professional.businessName || elegida.professional.name}</h2>
                <p className="truncate text-xs text-slate-500">
                  Cliente: {elegida.user.email} · Oferente: {elegida.professional.user?.email ?? "sin cuenta"} ·{" "}
                  <a href={`/profesionales/${elegida.professional.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">ver perfil</a>
                </p>
              </div>
              <span className="adm-badge adm-badge-info">Solo lectura</span>
            </div>
            <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
              {elegida.messages.map((m) => {
                const delPro = m.sender === "profesional";
                return (
                  <li key={m.id} className={`flex ${delPro ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${delPro ? "bg-emerald-50 text-emerald-950" : "bg-white text-slate-800"}`}>
                      <p className="text-[11px] font-semibold text-slate-500">{delPro ? elegida.professional.businessName || elegida.professional.name : elegida.user.name}</p>
                      {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                      {m.attachmentUrl && (
                        m.attachmentType?.startsWith("image/")
                          ? <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"><img src={m.attachmentUrl} alt={m.attachmentName ?? "Imagen adjunta"} className="mt-1 max-h-48 rounded-lg" /></a>
                          : <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-indigo-700 hover:underline">📎 {m.attachmentName ?? "Archivo adjunto"}</a>
                      )}
                      <p className="mt-0.5 text-right text-[10px] text-slate-400">{formatDateTime(m.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
              {!elegida.messages.length && <li className="py-6 text-center text-sm text-slate-500">Esta conversación todavía no tiene mensajes.</li>}
            </ol>
          </>
        ) : (
          <p className="m-auto p-8 text-center text-sm text-slate-500">{conversacionId ? "Esa conversación ya no existe." : "Elegí una conversación de la lista para leerla."}</p>
        )}
      </section>
    </div>
  );
}
