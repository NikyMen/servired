"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { PaperclipIcon, XIcon } from "@/components/icons";
import { formatBytes } from "@/lib/format";

type ServiceOption = { id: string; title: string; priceFrom: number };
type UploadedAttachment = { url: string; name: string; type: string; size: number };

const MAX_FILES = 6;
const MAX_BYTES = 8 * 1024 * 1024;

/** Solicitud del cliente: explica el trabajo y luego el oferente cotiza. */
export function ContratarBox({
  professionalId,
  services,
  frame = true,
}: {
  professionalId: string;
  services: ServiceOption[];
  frame?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState<"solicitud" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pedirLogin() {
    router.push(`/entrar?next=${encodeURIComponent(`/profesionales/${professionalId}`)}`);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    if (files.length + incoming.length > MAX_FILES) {
      setError(`Podés adjuntar hasta ${MAX_FILES} imágenes.`);
      return;
    }
    const invalid = incoming.find((file) => !file.type.startsWith("image/") || file.size > MAX_BYTES);
    if (invalid) {
      setError("Solo se aceptan imágenes de hasta 8 MB cada una.");
      return;
    }
    setError(null);
    setFiles((current) => [...current, ...incoming]);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
    if (fileInput.current) fileInput.current.value = "";
  }

  async function enviarSolicitud() {
    setError(null);
    if (text.trim().length < 5 && files.length === 0) {
      setError("Contá qué necesitás o adjuntá una imagen del trabajo.");
      return;
    }
    setSending("solicitud");
    try {
      const attachments: UploadedAttachment[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const upload = await fetch("/api/upload", { method: "POST", body: form });
        const data = await upload.json().catch(() => ({}));
        if (upload.status === 401) {
          pedirLogin();
          return;
        }
        if (!upload.ok) throw new Error(data.error ?? "No pudimos subir una imagen.");
        attachments.push({ url: data.url, name: data.name, type: data.type, size: data.size });
      }

      const res = await fetch("/api/contrataciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          serviceId: serviceId || null,
          note: text,
          attachments,
        }),
      });
      if (res.status === 401) {
        pedirLogin();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos enviar la solicitud.");
      }
      router.push("/contrataciones?nueva=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className={`space-y-3 ${frame ? "glass glass-solid rounded-2xl p-5" : ""}`}>
      {frame && <h2 className="font-bold text-slate-900">Enviar solicitud de trabajo</h2>}

      {services.length > 0 && (
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="glass-field cursor-pointer px-3 py-2.5 text-sm"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      )}

      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contale qué necesitás, cuándo y dónde. El profesional te envía un presupuesto."
        className="glass-field resize-none px-3 py-2.5 text-sm"
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="glass flex w-full items-center justify-center gap-2 rounded-xl border-dashed border-white/70 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-[rgb(var(--accent-rgb)/0.45)] hover:bg-white/70"
      >
        <PaperclipIcon width={17} height={17} />
        Adjuntar imágenes ({files.length}/{MAX_FILES})
      </button>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="glass glass-thin flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-slate-600">{file.name} · {formatBytes(file.size)}</span>
              <button type="button" onClick={() => removeFile(index)} aria-label={`Quitar ${file.name}`} className="text-slate-400 hover:text-red-600">
                <XIcon width={15} height={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button variant="cliente" onClick={enviarSolicitud} disabled={sending != null} className="w-full disabled:opacity-60">
          {sending === "solicitud" ? "Enviando…" : "Enviar solicitud de trabajo"}
        </Button>
      </div>

      <p className="text-xs text-slate-400">El profesional revisa tu pedido, puede rechazarlo o enviarte un presupuesto.</p>
    </div>
  );
}
