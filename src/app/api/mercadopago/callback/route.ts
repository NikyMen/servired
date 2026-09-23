import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { interactionAccess } from "@/lib/auth";
import { connectMercadoPago, mercadoPagoConfigured } from "@/lib/mercadopago";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const stored = jar.get("mp_oauth_state")?.value;
  jar.delete("mp_oauth_state");
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const access = await interactionAccess();
  const result = new URL("/pro", process.env.APP_URL);
  if ("error" in access || !access.user.professionalId || access.user.professionalStatus !== "approved" || !mercadoPagoConfigured() || !stored || !state || !code || stored.length !== state.length || !timingSafeEqual(Buffer.from(stored), Buffer.from(state))) {
    const motivo = "error" in access ? "sin sesión" : !access.user.professionalId || access.user.professionalStatus !== "approved" ? "profesional no aprobado" : !mercadoPagoConfigured() ? "faltan variables MP" : !code ? `sin code (error=${req.nextUrl.searchParams.get("error")})` : !stored ? "sin cookie de state" : "state no coincide";
    console.error(`[mercadopago] callback rechazado: ${motivo}`);
    result.searchParams.set("mp", "error");
    return NextResponse.redirect(result);
  }
  try {
    await connectMercadoPago(access.user.professionalId, code, state);
    result.searchParams.set("mp", "conectado");
  } catch (error) {
    console.error("[mercadopago] no se pudo vincular la cuenta:", error);
    result.searchParams.set("mp", "error");
  }
  return NextResponse.redirect(result);
}
