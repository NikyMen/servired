import { NextResponse } from "next/server";
import { issueEmailVerification } from "@/lib/email-verification";
import { verificationUserId } from "@/lib/pending-verification";

export async function POST() {
  const who = await verificationUserId();
  if (!who) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  const result = await issueEmailVerification(who.userId);
  return NextResponse.json(result, { status: result.ok ? 200 : 429 });
}
