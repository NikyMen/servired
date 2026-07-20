import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** API de DeepSeek: compatible con el formato de OpenAI. */
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

const MAX_HISTORY = 12; // mensajes que se mandan de contexto
const MAX_CHARS = 2000; // por mensaje
const MAX_TOKENS = 700; // de la respuesta

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Límite por IP, en memoria.
 *
 * Alcanza para que un solo navegador no queme la cuota, pero se reinicia con el
 * proceso y no se comparte entre instancias: si esto sale a producción detrás de
 * varias réplicas, hay que moverlo a Redis o al gateway.
 */
const RATE_LIMIT = { max: 20, windowMs: 10 * 60 * 1000 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    // Barrido de vencidos: sin esto el Map crece para siempre.
    if (hits.size > 500) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT.max;
}

function buildSystemPrompt(categories: { name: string; slug: string }[]): string {
  return [
    "Sos ServiRed IA, el asistente de ServiRed, un marketplace argentino que conecta",
    "clientes con profesionales verificados (plomería, electricidad, limpieza, jardinería,",
    "pintura, gas, carpintería, abogados, contadores, diseño).",
    "",
    "Cómo funciona ServiRed:",
    "- El lado CLIENTE (azul) busca profesionales, los contrata y coordina por mensajes.",
    "- El lado PROFESIONAL (verde) publica servicios y recibe pedidos.",
    "- Se cambia de lado con el interruptor del encabezado.",
    "- Si no aparece lo que buscan, pueden publicar una solicitud y que los contacten.",
    "",
    `Rubros disponibles hoy: ${categories.map((c) => c.name).join(", ")}.`,
    "",
    "Cómo respondés:",
    "- En español rioplatense (voseo: 'podés', 'necesitás', 'fijate'). Nada de 'tú' ni 'usted'.",
    "- Breve y concreto: 2 o 3 párrafos cortos como máximo, sin relleno.",
    "- Ayudás a describir el problema, estimar qué rubro corresponde y qué preguntarle al profesional.",
    "- Si te piden un precio exacto, aclarás que depende del trabajo y sugerís pedir presupuesto.",
    "- Si la consulta no tiene nada que ver con servicios del hogar o con ServiRed, lo decís",
    "  amablemente y volvés al tema.",
    "- No inventes profesionales, precios ni reseñas: no tenés acceso al catálogo real.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ServiRed IA todavía no está configurado. Falta DEEPSEEK_API_KEY en .env.local (ver .env.example).",
      },
      { status: 503 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Estás yendo muy rápido. Probá de nuevo en un rato." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "Faltan los mensajes." }, { status: 422 });
  }

  const messages: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    const role = (m as ChatMessage)?.role;
    const content = (m as ChatMessage)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return NextResponse.json({ error: "Mensaje inválido." }, { status: 422 });
    }
    if (content.trim()) messages.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: "Escribí una consulta." }, { status: 422 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true, slug: true },
  });

  let upstream: Response;
  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
        messages: [{ role: "system", content: buildSystemPrompt(categories) }, ...messages],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      { error: "No pude conectarme con la IA. Fijate la conexión y probá de nuevo." },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    // El cuerpo del error puede traer la key o detalles internos: se loguea, no se devuelve.
    const detail = await upstream.text().catch(() => "");
    console.error(`[ia] DeepSeek respondió ${upstream.status}: ${detail.slice(0, 500)}`);

    const message =
      upstream.status === 401
        ? "La API key de DeepSeek no es válida. Revisá DEEPSEEK_API_KEY en .env.local."
        : upstream.status === 402
          ? "La cuenta de DeepSeek no tiene saldo."
          : upstream.status === 429
            ? "DeepSeek está limitando los pedidos. Probá en unos minutos."
            : "La IA no está respondiendo. Probá de nuevo en un rato.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return new Response(toTextStream(upstream.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Evita que un proxy junte el stream y lo entregue todo al final.
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Convierte el SSE de DeepSeek en texto plano.
 *
 * El cliente solo quiere las letras: que se ocupe acá de desarmar el
 * "data: {...}" y no en el navegador.
 */
function toTextStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Un chunk puede cortar una línea al medio: se procesa hasta el último
          // \n y el resto queda en el buffer para el chunk que viene.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Fragmento suelto que no es JSON válido: se ignora y sigue.
            }
          }
        }
        controller.close();
      } catch (e) {
        console.error("[ia] se cortó el stream:", e);
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
