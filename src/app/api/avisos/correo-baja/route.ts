import { NextRequest, NextResponse } from "next/server";
import { darDeBajaAviso, esTipoAviso, firmaValida } from "@/lib/avisos-correo";

/**
 * POST /api/avisos/correo-baja?u&tipo&t — baja en un clic que dispara el
 * cliente de correo (List-Unsubscribe-Post). Solo POST: un GET lo puede abrir
 * cualquier antispam, y eso no tiene que dar de baja a nadie.
 */
export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const userId = params.get("u") ?? "";
  const tipo = params.get("tipo") ?? "";
  if (!firmaValida(userId, tipo, params.get("t") ?? "") || !esTipoAviso(tipo)) return NextResponse.json({ error: "El enlace no es válido." }, { status: 400 });
  await darDeBajaAviso(userId, tipo);
  return NextResponse.json({ ok: true });
}
