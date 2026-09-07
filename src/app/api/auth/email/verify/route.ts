import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { consumeEmailVerification } from "@/lib/email-verification";
import { clearPendingVerification, verificationUserId } from "@/lib/pending-verification";

export async function POST(req: NextRequest) {
  const who = await verificationUserId();
  if (!who) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  const body = await req.json().catch(() => null) as { value?: string } | null;
  const result = await consumeEmailVerification(who.userId, body?.value || "");

  // Recién acá se crea la cuenta de verdad: código correcto => sesión.
  if (result.ok && who.pending) {
    await createSession(who.userId);
    await clearPendingVerification();
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
