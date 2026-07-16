import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TIPOS = ["cliente", "profesional"];

// Deja solo dígitos y un + inicial: "(011) 15-4444 5555" -> "+0111544445555"
function normalizePhone(raw: string) {
  const plus = raw.trim().startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

// POST /api/preinscripciones — registra a alguien en la lista de preinscriptos
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, email, phone, type } = (body ?? {}) as Record<string, unknown>;

  const errors: string[] = [];
  if (typeof name !== "string" || name.trim().length < 2)
    errors.push("Ingresá tu nombre.");
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    errors.push("Ingresá un correo válido.");

  const cleanPhone = typeof phone === "string" ? normalizePhone(phone) : "";
  if (cleanPhone.replace(/\D/g, "").length < 8)
    errors.push("Ingresá un teléfono válido (mínimo 8 dígitos).");

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
  }

  const tipo = typeof type === "string" && TIPOS.includes(type) ? type : "cliente";

  try {
    const created = await prisma.preregistration.create({
      data: {
        name: (name as string).trim(),
        email: (email as string).trim().toLowerCase(),
        phone: cleanPhone,
        type: tipo,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Ese correo ya está preinscripto. ¡Ya estás en la lista!" },
        { status: 409 },
      );
    }
    throw err;
  }
}
