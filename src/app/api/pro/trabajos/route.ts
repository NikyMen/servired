import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { UPLOAD_URL } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Tope por perfil: la galería es una muestra, no un álbum sin fondo. */
const MAX_FOTOS = 24;

// POST /api/pro/trabajos — suma una foto de un trabajo particular a la galería
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.professionalId) {
    return NextResponse.json(
      { error: "Necesitás un perfil profesional para cargar trabajos." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { url, title, description } = (body ?? {}) as Record<string, unknown>;

  if (typeof url !== "string" || !UPLOAD_URL.test(url)) {
    return NextResponse.json({ error: "Falta la foto del trabajo." }, { status: 422 });
  }
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 80) : "";
  if (cleanTitle.length < 3) {
    return NextResponse.json(
      { error: "Poné un título, aunque sea corto: “Instalación de termotanque”." },
      { status: 422 }
    );
  }

  const total = await prisma.workPhoto.count({
    where: { professionalId: user.professionalId },
  });
  if (total >= MAX_FOTOS) {
    return NextResponse.json(
      { error: `Podés mostrar hasta ${MAX_FOTOS} trabajos. Borrá alguno para subir otro.` },
      { status: 422 }
    );
  }

  const photo = await prisma.workPhoto.create({
    data: {
      url,
      title: cleanTitle,
      description:
        typeof description === "string" && description.trim()
          ? description.trim().slice(0, 400)
          : null,
      professionalId: user.professionalId,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
