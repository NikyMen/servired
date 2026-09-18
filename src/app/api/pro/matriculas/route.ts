import { NextRequest, NextResponse } from "next/server";
import { interactionAccess } from "@/lib/auth";
import { crearCredencial, listarCredenciales } from "@/lib/matriculas";

/** Solo un profesional aprobado carga matrículas: la sección está en su perfil. */
async function profesionalAprobado() {
  const access = await interactionAccess();
  if ("error" in access) return { respuesta: NextResponse.json({ error: access.error }, { status: access.status }) };
  if (!access.user.professionalId || access.user.professionalStatus !== "approved") return { respuesta: NextResponse.json({ error: "Tu perfil profesional todavía no fue aprobado." }, { status: 403 }) };
  return { professionalId: access.user.professionalId };
}

// GET /api/pro/matriculas — las propias.
export async function GET() {
  const pro = await profesionalAprobado();
  if (!("professionalId" in pro)) return pro.respuesta;
  return NextResponse.json(await listarCredenciales(pro.professionalId!));
}

// POST /api/pro/matriculas — multipart: kind, categoryId?, number?, issuer?, file.
export async function POST(req: NextRequest) {
  const pro = await profesionalAprobado();
  if (!("professionalId" in pro)) return pro.respuesta;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No pudimos leer el formulario." }, { status: 400 });
  const texto = (key: string) => String(form.get(key) ?? "");
  const file = form.get("file");
  const result = await crearCredencial(pro.professionalId!, { kind: texto("kind"), categoryId: texto("categoryId"), number: texto("number"), issuer: texto("issuer") }, file instanceof File ? file : null);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result, { status: 201 });
}
