import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin";
import {
  createPreinscription,
  isDuplicatePreinscriptionError,
  parsePreinscription,
} from "@/lib/preinscripciones";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = parsePreinscription(body);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 422 });

  try {
    return NextResponse.json(await createPreinscription(parsed.data), { status: 201 });
  } catch (err) {
    if (isDuplicatePreinscriptionError(err)) {
      return NextResponse.json({ error: "Ese correo ya está preinscripto." }, { status: 409 });
    }
    console.error("No se pudo guardar la preinscripción desde admin", err);
    return NextResponse.json({ error: "No se pudo guardar el contacto." }, { status: 503 });
  }
}
