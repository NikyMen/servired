import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { ubicarIp } from "@/lib/geoip";
import { ipCliente } from "@/lib/intentos";
import { prisma } from "@/lib/prisma";

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Tipo de dispositivo por el user agent: alcanza para separar celular de compu. */
function dispositivo(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini/i.test(ua)) return "celular";
  return "compu";
}

/** /profesionales/<id> → id; cualquier otra ruta → null. */
function perfilDeRuta(path: string) {
  return /^\/profesionales\/([A-Za-z0-9_-]+)\/?$/.exec(path)?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const sessionKey = clean(body.sessionKey, 80);
  const visitorKey = clean(body.visitorKey, 80);
  if (!sessionKey || !visitorKey) return NextResponse.json({ error: "Sesión inválida." }, { status: 422 });

  const path = clean(body.path, 300) || "/";
  const durationSeconds = Math.min(Math.max(Number(body.durationSeconds) || 0, 0), 86_400);

  // Con cuenta = la cookie apunta a una sesión vigente. Sin cargar el usuario:
  // este aviso llega cada 15 segundos por visitante.
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const conCuenta = token ? Boolean(await prisma.session.findFirst({ where: { token, expiresAt: { gt: new Date() } }, select: { id: true } })) : false;

  let session = await prisma.analyticsSession.findUnique({ where: { sessionKey }, select: { id: true } });
  if (session) {
    await prisma.analyticsSession.update({ where: { id: session.id }, data: { durationSeconds, lastSeenAt: new Date(), lastPath: path, conCuenta } });
  } else {
    const rawSource = clean(body.source, 300) || "Directo";
    let source = rawSource;
    try { source = new URL(rawSource).hostname; } catch { /* utm_source o directo */ }
    // La ubicación se calcula una vez por visita; la IP no se guarda.
    const geo = await ubicarIp(ipCliente(req.headers));
    const country = geo?.country ?? (clean(req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry"), 80) || null);
    const city = geo?.city ?? (clean(req.headers.get("x-vercel-ip-city"), 100) || null);
    session = await prisma.analyticsSession.upsert({
      where: { sessionKey },
      create: {
        sessionKey, visitorKey, source, country, city, region: geo?.region ?? null, latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null,
        device: dispositivo(req.headers.get("user-agent") ?? ""), conCuenta, firstPath: path, lastPath: path, durationSeconds,
      },
      update: { durationSeconds, lastSeenAt: new Date(), lastPath: path, conCuenta },
      select: { id: true },
    });
  }

  // Una página vista por navegación. El doble efecto de React o un recargo
  // rápido no cuentan dos veces la misma página.
  if (body.view === true) {
    const repetida = await prisma.pageView.findFirst({ where: { sessionId: session.id, path, createdAt: { gte: new Date(Date.now() - 10_000) } }, select: { id: true } });
    if (!repetida) await prisma.pageView.create({ data: { sessionId: session.id, path, professionalId: perfilDeRuta(path) } });
  }

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
