import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { interactionAccess } from "@/lib/auth";
import { mercadoPagoConfigured, mercadoPagoRedirectUri } from "@/lib/mercadopago";

export async function GET() {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.redirect(new URL("/entrar?next=/pro", process.env.APP_URL));
  if (!access.user.professionalId || access.user.professionalStatus !== "approved") return NextResponse.redirect(new URL("/pro", process.env.APP_URL));
  if (!mercadoPagoConfigured()) return NextResponse.redirect(new URL("/pro?mp=sin_configurar", process.env.APP_URL));
  const state = randomBytes(32).toString("hex");
  (await cookies()).set("mp_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/mercadopago", maxAge: 600 });
  const url = new URL("https://auth.mercadopago.com.ar/authorization");
  url.search = new URLSearchParams({ client_id: process.env.MP_CLIENT_ID!, response_type: "code", platform_id: "mp", redirect_uri: mercadoPagoRedirectUri(), state }).toString();
  return NextResponse.redirect(url);
}
