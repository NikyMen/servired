import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/email-verification";
import { verificationUserId } from "@/lib/pending-verification";

export async function POST(req: NextRequest) {
  const who = await verificationUserId();
  if (!who) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  const current = await prisma.user.findUnique({ where: { id: who.userId }, select: { emailVerifiedAt: true } });
  if (!current) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (current.emailVerifiedAt) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Ingresá un email válido." }, { status: 422 });
  try {
    await prisma.user.update({ where: { id: who.userId }, data: { email, accountStatus: "email_pending" } });
    const result = await issueEmailVerification(who.userId);
    return NextResponse.json(result, { status: result.ok ? 200 : 429 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Ese email ya pertenece a otra cuenta." }, { status: 409 });
    throw error;
  }
}
