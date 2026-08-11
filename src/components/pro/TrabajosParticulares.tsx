"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon, XIcon, ImageIcon } from "@/components/icons";
import { MapPicker } from "@/components/MapPicker";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export type TrabajoParticular = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Galería de trabajos particulares.
 *
 * Son trabajos que el profesional hizo por fuera de ServiRed: no hay
 * contratación detrás, así que no hay cliente que pueda calificarlos. Por eso se
 * muestran aparte de "Trabajos realizados" y siempre dicen de dónde salen —
 * mezclarlos sería hacer pasar por verificado algo que no lo es.
 */
export function TrabajosParticulares({ fotos }: { fotos: TrabajoParticular[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("Corrientes");
  const [latitude, setLatitude] = useState(-27.4692);
  const [longitude, setLongitude] = useState(-58.8306);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abierto = file != null;

  function elegir(elegido: File | undefined) {
    if (!elegido) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(elegido);
    setPreview(URL.createObjectURL(elegido));
    setError(null);
  }

  function cancelar() {
    if (preview) URL.revokeObjectURL(preview);
    if (fileInput.current) fileInput.current.value = "";
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setAddress("Corrientes");
    setLatitude(-27.4692);
    setLongitude(-58.8306);
    setError(null);
  }

  async function guardar() {
    if (!file) return;
    if (title.trim().length < 3) {
      setError("Poné un título, aunque sea corto: “Instalación de termotanque”.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const subida = await fetch("/api/upload", { method: "POST", body: form });
      const data = await subida.json().catch(() => ({}));
      if (!subida.ok) throw new Error(data.error ?? "No pudimos subir la foto.");

      const res = await fetch("/api/pro/trabajos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url, title, description, address, latitude, longitude }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No pudimos guardar el trabajo.");
      }
      cancelar();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id: string) {
    setBorrando(id);
    setError(null);
    try {
      const res = await fetch(`/api/pro/trabajos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No pudimos borrar la foto.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setBorrando(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Trabajos particulares</h2>
          <p className="text-sm text-slate-500">
            Trabajos tuyos hechos fuera de ServiRed. Se muestran en tu perfil sin
            calificación, como muestra de lo que hacés.
          </p>
        </div>
        {!abierto && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="glass-btn shrink-0 px-3.5 py-2 text-sm [--accent-dark:var(--color-pro-dark)] [--accent-rgb:5_150_105]"
          >
            <PlusIcon width={16} height={16} />
            Subir foto
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-300/50 bg-red-50/70 px-3.5 py-2.5 text-sm text-red-700 backdrop-blur-sm">
          {error}
        </p>
      )}

      {/* Alta: aparece recién cuando ya eligió la foto, que es el único dato
          que no se puede improvisar. */}
      {abierto && (
        <div className="glass glass-solid animate-reveal-down flex flex-col gap-4 rounded-2xl p-4 sm:flex-row">
          {preview && (
            <img
              src={preview}
              alt=""
              className="h-40 w-full rounded-xl object-cover sm:h-32 sm:w-44"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Qué trabajo es. Ej: Instalación de termotanque"
              className="glass-field px-3 py-2.5 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="Detalle opcional: qué resolviste, cuánto llevó, materiales."
              className="glass-field resize-none px-3 py-2.5 text-sm"
            />
            <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={180} placeholder="Dirección o referencia en Corrientes" className="glass-field px-3 py-2.5 text-sm" />
            <MapPicker latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="glass-btn px-4 py-2 text-sm [--accent-dark:var(--color-pro-dark)] [--accent-rgb:5_150_105] disabled:opacity-60"
              >
                {guardando ? "Subiendo…" : "Agregar al perfil"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={guardando}
                className="glass-btn glass-btn-ghost px-4 py-2 text-sm disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {fotos.length === 0 && !abierto ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="glass flex w-full flex-col items-center gap-1.5 rounded-2xl border-dashed border-white/70 p-8 text-sm text-slate-500 transition-colors hover:border-pro/45 hover:bg-white/70"
        >
          <ImageIcon width={22} height={22} className="text-slate-400" />
          <span className="font-medium text-slate-600">Todavía no subiste ninguna foto</span>
          <span className="text-xs">
            Mostrá trabajos que hiciste por tu cuenta mientras cerrás los primeros por ServiRed.
          </span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto) => (
            <li key={foto.id} className="glass glass-card group relative overflow-hidden rounded-2xl">
              <img src={foto.url} alt={foto.title} className="h-32 w-full object-cover sm:h-36" />
              <div className="p-3">
                <p className="truncate text-sm font-semibold text-slate-900">{foto.title}</p>
                {foto.description && (
                  <p className="line-clamp-2 text-xs text-slate-500">{foto.description}</p>
                )}
                {foto.address && <p className="mt-1 truncate text-[11px] text-slate-400">📍 {foto.address}</p>}
              </div>
              <button
                type="button"
                onClick={() => borrar(foto.id)}
                disabled={borrando === foto.id}
                aria-label={`Borrar ${foto.title}`}
                className="absolute top-2 right-2 rounded-full bg-slate-900/55 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-600/90 disabled:opacity-60"
              >
                {borrando === foto.id ? <XIcon width={14} height={14} /> : <TrashIcon width={14} height={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => elegir(e.target.files?.[0])}
      />
    </section>
  );
}
