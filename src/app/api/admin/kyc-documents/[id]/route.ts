import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { readKycDocument } from "@/lib/kyc";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const document = await prisma.kycDocument.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Documento inexistente." }, { status: 404 });
  try {
    const data = await readKycDocument(document.filename);
    const commonHeaders = { "Content-Type": document.mimeType, "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="${document.kind}.${document.filename.split(".").pop()}"`, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" };
    const range = req.headers.get("range");
    if (range && document.mimeType.startsWith("video/")) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
        if (start <= end && start < data.length) return new NextResponse(data.subarray(start, end + 1), { status: 206, headers: { ...commonHeaders, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": String(end - start + 1) } });
      }
    }
    return new NextResponse(data, { headers: { ...commonHeaders, "Content-Length": String(data.length) } });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el documento." }, { status: 404 });
  }
}
