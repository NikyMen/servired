import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "El pago demo fue reemplazado por el flujo de alias." }, { status: 410 });
}
