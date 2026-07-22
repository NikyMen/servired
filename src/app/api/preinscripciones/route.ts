import { NextRequest, NextResponse } from "next/server";
import {
  createPreinscription,
  isDuplicatePreinscriptionError,
  parsePreinscription,
} from "@/lib/preinscripciones";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = parsePreinscription(body);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 422 });

  try {
    const created = await createPreinscription(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (isDuplicatePreinscriptionError(err)) {
      return NextResponse.json(
        { error: "Ese correo ya está preinscripto. ¡Ya estás en la lista!" },
        { status: 409 },
      );
    }
    console.error("No se pudo guardar la preinscripción", err);
    return NextResponse.json({ error: "No pudimos guardar tus datos. Probá de nuevo." }, { status: 503 });
  }
}
