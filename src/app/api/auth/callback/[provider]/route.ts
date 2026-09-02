import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { decodeChallenge, oauthClient, type OAuthProvider } from "@/lib/oauth";
import { issueEmailVerification } from "@/lib/email-verification";

type SocialProfile = { id: string; email: string | null; emailVerified: boolean; name: string; picture: string | null };

async function googleProfile(accessToken: string): Promise<SocialProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("Google no devolvió el perfil.");
  const data = await response.json() as Record<string, unknown>;
  return { id: String(data.sub), email: typeof data.email === "string" ? data.email.toLowerCase() : null, emailVerified: data.email_verified === true, name: typeof data.name === "string" ? data.name : "Usuario", picture: typeof data.picture === "string" ? data.picture : null };
}

async function facebookProfile(accessToken: string): Promise<SocialProfile> {
  const url = new URL("https://graph.facebook.com/me");
  url.searchParams.set("fields", "id,name,email,picture.type(large)");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Facebook no devolvió el perfil.");
  const data = await response.json() as { id?: string; email?: string; name?: string; picture?: { data?: { url?: string } } };
  return { id: String(data.id || ""), email: data.email?.toLowerCase() || null, emailVerified: Boolean(data.email), name: data.name || "Usuario", picture: data.picture?.data?.url || null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params;
  if (raw !== "google" && raw !== "facebook") return NextResponse.redirect(new URL("/entrar?error=oauth", req.url));
  const provider = raw as OAuthProvider;
  const jar = await cookies();
  const challenge = decodeChallenge(jar.get("servired_oauth")?.value);
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  if (!challenge || challenge.provider !== provider || challenge.state !== state || !code) {
    return NextResponse.redirect(new URL("/entrar?error=oauth_state", req.url));
  }

  try {
    const tokens = provider === "google"
      ? await oauthClient("google").validateAuthorizationCode(code, challenge.verifier!)
      : await oauthClient("facebook").validateAuthorizationCode(code);
    const profile = provider === "google" ? await googleProfile(tokens.accessToken()) : await facebookProfile(tokens.accessToken());
    if (!profile.id) throw new Error("Perfil social incompleto.");

    const account = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.id } },
      include: { user: true },
    });
    let user = account?.user ?? null;
    if (!user && profile.email && profile.emailVerified) user = await prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      const email = profile.email || `${provider}-${profile.id}@pending.servired.invalid`;
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name,
          role: "cliente",
          avatarUrl: profile.picture,
          avatarColor: "#2563eb",
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
          accountStatus: profile.emailVerified ? "approved" : "email_pending",
        },
      });
    }
    if (profile.emailVerified && !user.emailVerifiedAt && user.accountStatus !== "suspended") {
      user = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date(), accountStatus: "approved" } });
    }
    if (!account) {
      await prisma.oAuthAccount.create({ data: { provider, providerAccountId: profile.id, userId: user.id } });
    }
    await createSession(user.id);
    if (!user.emailVerifiedAt && !user.email.endsWith("@pending.servired.invalid")) {
      await issueEmailVerification(user.id).catch((error) => console.error("[oauth-email]", error));
    }
    jar.delete("servired_oauth");
    const intended = challenge.providerType && challenge.next === "/" ? `/pro?tipo=${challenge.providerType}` : challenge.next;
    if (user.accountStatus !== "approved" && intended !== "/") jar.set("servired_after_verify", intended, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
    return NextResponse.redirect(new URL(user.accountStatus === "approved" ? intended : `/onboarding?next=${encodeURIComponent(intended)}`, req.url));
  } catch (error) {
    console.error("[oauth]", error);
    return NextResponse.redirect(new URL("/entrar?error=oauth", req.url));
  }
}
