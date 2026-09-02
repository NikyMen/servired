import { NextRequest, NextResponse } from "next/server";
import { createChallenge, encodeChallenge, oauthClient, safeInternalPath, type OAuthProvider } from "@/lib/oauth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params;
  if (raw !== "google" && raw !== "facebook") return NextResponse.json({ error: "Proveedor inválido." }, { status: 404 });
  const provider = raw as OAuthProvider;
  const rawType = req.nextUrl.searchParams.get("tipo");
  const providerType = rawType === "profesional" || rawType === "oficio" ? rawType : undefined;
  const challenge = createChallenge(provider, safeInternalPath(req.nextUrl.searchParams.get("next")), providerType);
  const url = provider === "google"
    ? oauthClient("google").createAuthorizationURL(challenge.state, challenge.verifier!, ["openid", "email", "profile"])
    : oauthClient("facebook").createAuthorizationURL(challenge.state, ["email", "public_profile"]);
  const response = NextResponse.redirect(url);
  response.cookies.set("servired_oauth", encodeChallenge(challenge), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600,
  });
  return response;
}
