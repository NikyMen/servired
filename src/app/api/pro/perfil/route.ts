import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { UPLOAD_URL } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Lee una URL de foto del body: string válida, o null para sacar la foto.
 * `undefined` significa "no la tocan" y se distingue de "la borran".
 */
function readPhoto(value: unknown): string | null | undefined | "error" {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" && UPLOAD_URL.test(value)) return value;
  return "error";
}

// PATCH /api/pro/perfil — cambia la foto de perfil y la de portada
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.professionalId) {
    return NextResponse.json(
      { error: "Necesitás un perfil profesional para editarlo." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { avatarUrl, coverUrl } = (body ?? {}) as Record<string, unknown>;
  const avatar = readPhoto(avatarUrl);
  const cover = readPhoto(coverUrl);
  if (avatar === "error" || cover === "error") {
    return NextResponse.json({ error: "Esa imagen no es válida." }, { status: 422 });
  }

  const pro = await prisma.professional.update({
    // Por id del perfil que trae la sesión: nadie puede pasar el de otro.
    where: { id: user.professionalId },
    data: {
      ...(avatar !== undefined ? { avatarUrl: avatar } : {}),
      ...(cover !== undefined ? { coverUrl: cover } : {}),
    },
    select: { avatarUrl: true, coverUrl: true },
  });

  // La foto de perfil también es la de la cuenta: es la que sale en el menú.
  if (avatar !== undefined) {
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: avatar } });
  }

  return NextResponse.json(pro);
}
