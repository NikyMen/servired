import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { consumeEmailVerification } from "@/lib/email-verification";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  const body = await req.json().catch(() => null) as { value?: string } | null;
  const result = await consumeEmailVerification(user.id, body?.value || "");
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
