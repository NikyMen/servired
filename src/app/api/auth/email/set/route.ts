import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/email-verification";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Ingresá un email válido." }, { status: 422 });
  try {
    await prisma.user.update({ where: { id: user.id }, data: { email, accountStatus: "email_pending" } });
    const result = await issueEmailVerification(user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 429 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Ese email ya pertenece a otra cuenta." }, { status: 409 });
    throw error;
  }
}
