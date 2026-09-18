import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { readKycDocument } from "@/lib/kyc";

// GET /api/admin/matriculas/[id] — visor de administración, igual que el de los documentos del KYC.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const credencial = await prisma.credential.findUnique({ where: { id } });
  if (!credencial) return NextResponse.json({ error: "Documento inexistente." }, { status: 404 });
  try {
    const data = await readKycDocument(credencial.filename);
    return new NextResponse(data, { headers: { "Content-Type": credencial.mimeType, "Content-Length": String(data.length), "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="${credencial.kind}.${credencial.filename.split(".").pop()}"`, "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el documento." }, { status: 404 });
  }
}
