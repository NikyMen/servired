import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createVideoChallenge } from "@/lib/kyc";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entrá para verificar tu identidad." }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: "Verificá tu email antes de continuar." }, { status: 403 });
  return NextResponse.json(createVideoChallenge(user.id), { headers: { "Cache-Control": "no-store" } });
}
