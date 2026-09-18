import { NextResponse } from "next/server";
import { interactionAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readKycDocument } from "@/lib/kyc";
import { borrarCredencial } from "@/lib/matriculas";

// GET /api/pro/matriculas/[id] — el archivo, solo para su dueño (administración usa su propio visor).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const credencial = await prisma.credential.findUnique({ where: { id } });
  // A otra persona se le responde igual que si no existiera.
  if (!credencial || !access.user.professionalId || credencial.professionalId !== access.user.professionalId) return NextResponse.json({ error: "El documento no existe." }, { status: 404 });
  try {
    const data = await readKycDocument(credencial.filename);
    return new NextResponse(data, { headers: { "Content-Type": credencial.mimeType, "Content-Length": String(data.length), "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="${credencial.kind}.${credencial.filename.split(".").pop()}"`, "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el documento." }, { status: 404 });
  }
}

// DELETE /api/pro/matriculas/[id] — solo pendientes o rechazadas.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await interactionAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.user.professionalId) return NextResponse.json({ error: "El documento no existe." }, { status: 404 });
  const { id } = await params;
  const result = await borrarCredencial(access.user.professionalId, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
