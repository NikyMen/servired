import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

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

// POST /api/upload — sube una imagen o PDF y devuelve su URL pública
export async function POST(req: NextRequest) {
  // Con sesión nomás: si no, cualquiera llena el disco desde afuera.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Entrá para poder adjuntar archivos." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No pude leer el archivo." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 422 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo no puede pesar más de 8 MB." },
      { status: 413 }
    );
  }

  const type = file.type;
  const ext = ALLOWED[type];
  if (!ext) {
    return NextResponse.json(
      { error: "Solo se aceptan imágenes (JPG, PNG, WEBP, GIF) o PDF." },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!MAGIC[type](buffer)) {
    return NextResponse.json(
      { error: "El archivo no coincide con su formato. Probá con otro." },
      { status: 415 }
    );
  }

  // Nombre random: nada del nombre original toca el disco, así que no hay
  // forma de escaparse del directorio con "../" ni de pisar un archivo ajeno.
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  } catch (e) {
    console.error("[upload] no se pudo guardar:", e);
    return NextResponse.json({ error: "No pude guardar el archivo." }, { status: 500 });
  }

  return NextResponse.json(
    {
      url: `/uploads/${filename}`,
      // El nombre original solo se guarda para mostrarlo; se recorta y se limpia.
      name: sanitizeName(file.name) || `archivo.${ext}`,
      type,
      size: file.size,
    },
    { status: 201 }
  );
}

/** Deja el nombre en algo mostrable: sin rutas, sin caracteres raros, corto. */
function sanitizeName(name: string): string {
  return path
    .basename(name)
    .replace(/[^\p{L}\p{N}._ -]/gu, "")
    .trim()
    .slice(0, 80);
}
