import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const sessionKey = clean(body.sessionKey, 80);
  const visitorKey = clean(body.visitorKey, 80);
  if (!sessionKey || !visitorKey) return NextResponse.json({ error: "Sesión inválida." }, { status: 422 });

  const rawSource = clean(body.source, 300) || "Directo";
  let source = rawSource;
  try { source = new URL(rawSource).hostname; } catch { /* utm_source o directo */ }
  const durationSeconds = Math.min(Math.max(Number(body.durationSeconds) || 0, 0), 86_400);
  const country = clean(req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry"), 80) || null;
  const city = clean(req.headers.get("x-vercel-ip-city"), 100) || null;

  const session = await prisma.analyticsSession.upsert({
    where: { sessionKey },
    create: { sessionKey, visitorKey, source, country, city, firstPath: clean(body.path, 300) || "/", durationSeconds },
    update: { durationSeconds, lastSeenAt: new Date() },
  });

  const term = clean(body.term, 120);
  const categorySlug = clean(body.categorySlug, 100);
  if (term || categorySlug) {
    const category = categorySlug
      ? await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } })
      : null;
    const recent = await prisma.searchMetric.findFirst({
      where: { sessionId: session.id, term: term || null, categoryId: category?.id ?? null, createdAt: { gte: new Date(Date.now() - 30_000) } },
    });
    if (!recent) await prisma.searchMetric.create({ data: { sessionId: session.id, term: term || null, categoryId: category?.id } });
  }

  return new NextResponse(null, { status: 204 });
}
