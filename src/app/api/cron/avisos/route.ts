import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { barrerMensajesSinContestar } from "@/lib/avisos-correo";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/avisos — lo llama el crontab del servidor cada 15 minutos:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3655/api/cron/avisos
 * Sin CRON_SECRET queda apagada: no hay forma de dispararla desde afuera.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET no está configurado." }, { status: 503 });
  const esperado = Buffer.from(`Bearer ${secret}`);
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const mensajes = await barrerMensajesSinContestar();
  return NextResponse.json({ mensajes });
}
