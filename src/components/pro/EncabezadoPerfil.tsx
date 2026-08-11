"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, ImageIcon } from "@/components/icons";
import { initials } from "@/lib/format";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type Foto = "avatar" | "cover";

/**
 * Encabezado del panel: portada, foto y datos, editables en el lugar.
 *
 * Las fotos se cambian desde donde se ven, sin pantalla de edición aparte: el
 * profesional está mirando exactamente lo que va a ver el cliente.
 */
export function EncabezadoPerfil({
  name,
  headline,
  zone,
  avatarColor,
  avatarUrl,
  coverUrl,
  pendientes,
}: {
  name: string;
  headline: string;
  zone: string;
  avatarColor: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  pendientes: number;
}) {
  const router = useRouter();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<Foto | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiarFoto(cual: Foto, file: File | undefined) {
    if (!file) return;
    setError(null);
    setSubiendo(cual);
    try {
      const form = new FormData();
      form.append("file", file);
      const subida = await fetch("/api/upload", { method: "POST", body: form });
      const data = await subida.json().catch(() => ({}));
      if (!subida.ok) throw new Error(data.error ?? "No pudimos subir la foto.");

      const campo = cual === "avatar" ? "avatarUrl" : "coverUrl";
      const res = await fetch("/api/pro/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: data.url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No pudimos guardar la foto.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setSubiendo(null);
      if (avatarInput.current) avatarInput.current.value = "";
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-pro text-white">
      {/* Portada */}
      <div className="relative h-32 sm:h-44">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600" />
        )}
        <button
          type="button"
          onClick={() => coverInput.current?.click()}
          disabled={subiendo != null}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/55 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-slate-900/75 disabled:opacity-60"
        >
          <ImageIcon width={15} height={15} />
          {subiendo === "cover" ? "Subiendo…" : coverUrl ? "Cambiar portada" : "Agregar portada"}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {/* Foto de perfil, pisando la portada */}
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={subiendo != null}
          aria-label="Cambiar foto de perfil"
          className="group relative -mt-10 size-20 shrink-0 overflow-hidden rounded-full ring-4 ring-white/90 transition-transform hover:scale-[1.03] disabled:opacity-60 sm:size-24"
          style={{ backgroundColor: avatarColor }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-2xl font-semibold">
              {initials(name)}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-900/55 py-1 backdrop-blur-sm">
            <CameraIcon width={15} height={15} />
          </span>
        </button>

        <div className="min-w-0 flex-1 pt-3">
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-emerald-100">
            {headline} · {zone}
          </p>
        </div>

        <div className="shrink-0 pt-3 text-right">
          <p className="text-3xl font-bold">{pendientes}</p>
          <p className="text-sm text-emerald-100">
            {pendientes === 1 ? "pedido nuevo" : "pedidos nuevos"}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="bg-red-600/90 px-4 py-2 text-sm sm:px-6">
          {error}
        </p>
      )}

      <input
        ref={avatarInput}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => cambiarFoto("avatar", e.target.files?.[0])}
      />
      <input
        ref={coverInput}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => cambiarFoto("cover", e.target.files?.[0])}
      />
    </section>
  );
}
