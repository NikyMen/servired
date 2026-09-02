import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { issueEmailVerification } from "@/lib/email-verification";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  const result = await issueEmailVerification(user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 429 });
}
