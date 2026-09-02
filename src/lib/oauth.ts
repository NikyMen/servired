import { createHmac, timingSafeEqual } from "node:crypto";
import { Facebook, Google, generateCodeVerifier, generateState } from "arctic";

export type OAuthProvider = "google" | "facebook";

type Challenge = {
  provider: OAuthProvider;
  state: string;
  verifier?: string;
  next: string;
  providerType?: "profesional" | "oficio";
  exp: number;
};

function secret() {
  const value = process.env.OAUTH_STATE_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("Falta OAUTH_STATE_SECRET.");
  return value || "servired-dev-oauth";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeChallenge(challenge: Challenge) {
  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeChallenge(value: string | undefined): Challenge | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const challenge = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Challenge;
    return challenge.exp > Date.now() ? challenge : null;
  } catch {
    return null;
  }
}

export function createChallenge(provider: OAuthProvider, next: string, providerType?: Challenge["providerType"]) {
  return {
    provider,
    state: generateState(),
    ...(provider === "google" ? { verifier: generateCodeVerifier() } : {}),
    next,
    providerType,
    exp: Date.now() + 10 * 60 * 1000,
  } satisfies Challenge;
}

function callback(provider: OAuthProvider) {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/auth/callback/${provider}`;
}

export function oauthClient(provider: "google"): Google;
export function oauthClient(provider: "facebook"): Facebook;
export function oauthClient(provider: OAuthProvider): Google | Facebook {
  if (provider === "google") {
    return new Google(process.env.GOOGLE_CLIENT_ID || "", process.env.GOOGLE_CLIENT_SECRET || "", callback(provider));
  }
  return new Facebook(process.env.FACEBOOK_CLIENT_ID || "", process.env.FACEBOOK_CLIENT_SECRET || "", callback(provider));
}

export function safeInternalPath(value: string | null | undefined, fallback = "/") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
