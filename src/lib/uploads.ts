import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guardado de archivos subidos.
 *
 * Vive acá y no en /api/upload porque el registro también necesita guardar la
 * foto de perfil y la de portada, y en ese momento todavía no hay sesión: el
 * server action no puede pegarle a la ruta que exige estar logueado.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Tipos permitidos y su extensión.
 *
 * La extensión sale de acá y NUNCA del nombre que mandó el navegador: es lo que
 * decide con qué Content-Type lo va a servir Next después. Si dejáramos pasar el
 * nombre original, un "foto.html" se serviría como HTML desde nuestro dominio.
 */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Los mismos tipos, pero sin PDF: para fotos de perfil, portada y trabajos. */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/**
 * Primeros bytes de cada formato.
 * El navegador dice qué tipo es, pero cualquiera puede mentir: esto confirma que
 * el contenido sea de verdad lo que dice ser.
 */
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/gif": (b) => b.subarray(0, 3).toString("ascii") === "GIF",
  "image/webp": (b) =>
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP",
  "application/pdf": (b) => b.subarray(0, 4).toString("ascii") === "%PDF",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export type SavedUpload = { url: string; name: string; type: string; size: number };

/**
 * Forma exacta de las URL que devuelve saveUpload.
 * Cuando el cliente sube por /api/upload y después manda la URL en un JSON, esto
 * es lo que impide que guarde en la base cualquier cosa que se le ocurra.
 */
export const UPLOAD_URL = /^\/uploads\/[a-f0-9]{32}\.[a-z]{3,4}$/;

/** Error con el mensaje y el status que le corresponde a la respuesta HTTP. */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Valida y escribe el archivo en public/uploads.
 * `imagesOnly` deja afuera el PDF: sirve para las fotos, donde un adjunto que no
 * se puede mostrar rompería la grilla.
 */
export async function saveUpload(
  file: File,
  { imagesOnly = false }: { imagesOnly?: boolean } = {}
): Promise<SavedUpload> {
  if (file.size === 0) throw new UploadError("El archivo está vacío.", 422);
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("El archivo no puede pesar más de 8 MB.", 413);
  }

  const type = file.type;
  const ext = ALLOWED[type];
  if (!ext || (imagesOnly && type === "application/pdf")) {
    throw new UploadError(
      imagesOnly
        ? "Solo se aceptan imágenes (JPG, PNG, WEBP, GIF)."
        : "Solo se aceptan imágenes (JPG, PNG, WEBP, GIF) o PDF.",
      415
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!MAGIC[type](buffer)) {
    throw new UploadError("El archivo no coincide con su formato. Probá con otro.", 415);
  }

  // Nombre random: nada del nombre original toca el disco, así que no hay
  // forma de escaparse del directorio con "../" ni de pisar un archivo ajeno.
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  } catch (e) {
    console.error("[upload] no se pudo guardar:", e);
    throw new UploadError("No pude guardar el archivo.", 500);
  }

  return {
    url: `/uploads/${filename}`,
    // El nombre original solo se guarda para mostrarlo; se recorta y se limpia.
    name: sanitizeName(file.name) || `archivo.${ext}`,
    type,
    size: file.size,
  };
}

/** Deja el nombre en algo mostrable: sin rutas, sin caracteres raros, corto. */
function sanitizeName(name: string): string {
  return path
    .basename(name)
    .replace(/[^\p{L}\p{N}._ -]/gu, "")
    .trim()
    .slice(0, 80);
}
