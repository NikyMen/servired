import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { UploadError, saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

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

  try {
    // La validación (tamaño, tipo real por magic bytes) y la escritura viven en
    // src/lib/uploads.ts, porque el registro las necesita sin pasar por acá.
    const saved = await saveUpload(file);
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
