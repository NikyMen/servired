import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf" };

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif|pdf)$/.test(filename)) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await readFile(path.join(process.cwd(), "public", "uploads", filename));
    const ext = filename.split(".").pop()!;
    return new NextResponse(file, { headers: { "Content-Type": TYPES[ext], "Content-Disposition": ext === "pdf" ? `inline; filename="${filename}"` : "inline", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

